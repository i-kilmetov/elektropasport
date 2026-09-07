import { randomBytes } from "crypto";
import { isPhoneAuthStorageId } from "@/lib/phone-auth";
import { toTelegramChatId } from "@/lib/app-env";
import { PRODUCTION_APP_URL, TEST_APP_URL } from "@/lib/app-url";
import {
  countPanelModules,
  masterVisitPriceRub,
  parseModulesFromSetupTitle,
} from "@/lib/lead-services";
import { applyTokomPlusDiscount } from "@/lib/tokom-plus";
import {
  getInstallRequestById,
  getPanelById,
  getPendingSbpPaymentByRequestId,
  hasTokomPlus,
  insertSbpPayment,
  updateSbpPayment,
  type SbpPaymentRecord,
} from "@/lib/db";
import {
  buildRobokassaPaymentUrl,
  isRobokassaConfigured,
  newRobokassaInvId,
} from "@/lib/robokassa";
import { notifyCustomerMasterAccepted } from "@/lib/telegram-notify";
import { notifyUserWebPush } from "@/lib/web-push";
import type { InstallRequest } from "@/types";

function newOrderId(): string {
  return `p${Date.now().toString(36)}${randomBytes(6).toString("hex")}`.slice(
    0,
    36,
  );
}

function appOriginForOwner(storageTelegramId: number): string {
  return storageTelegramId < 0 ? TEST_APP_URL : PRODUCTION_APP_URL;
}

/** Visit amount: 1000 ₽ × panel modules, minimum 5000 ₽ (+ Plus discount). */
export async function resolveInstallRequestVisitAmountRub(
  request: InstallRequest & { telegramUserId?: number },
): Promise<number> {
  let modules = 0;
  if (request.panelId) {
    const panel = await getPanelById(request.panelId);
    modules = countPanelModules(panel?.devices ?? []);
  }
  if (modules <= 0) {
    modules = parseModulesFromSetupTitle(request.setupTitle);
  }
  const base = masterVisitPriceRub(modules);
  const ownerId = request.telegramUserId;
  const plus =
    typeof ownerId === "number" ? await hasTokomPlus(ownerId) : false;
  return applyTokomPlusDiscount(base, plus);
}

/**
 * Create (or reuse) a Robokassa payment link for an accepted install request.
 */
export async function ensureInstallRequestPayment(
  request: InstallRequest & { telegramUserId: number },
): Promise<SbpPaymentRecord | null> {
  if (!isRobokassaConfigured()) return null;
  if (request.status !== "payment" && request.status !== "new") return null;

  const amountRub = await resolveInstallRequestVisitAmountRub(request);
  const existing = await getPendingSbpPaymentByRequestId(request.id);
  if (existing?.qrPayload && existing.amountRub === amountRub) {
    return existing;
  }
  // Drop stale pending links (e.g. old fixed 2990 ₽ amount).
  if (existing) {
    await updateSbpPayment(existing.id, { status: "failed" });
  }

  const orderId = newOrderId();
  const invId = newRobokassaInvId();
  const origin = appOriginForOwner(request.telegramUserId);
  const paymentUrl = buildRobokassaPaymentUrl({
    invId,
    amountRub,
    description: `Выезд мастера · ${request.publicCode ?? request.id.slice(0, 8)}`,
    successUrl: `${origin}/`,
    failUrl: `${origin}/`,
    shp: {
      kind: "install",
      order_id: orderId,
      request_id: request.id,
    },
  });

  return insertSbpPayment({
    id: orderId,
    telegramUserId: request.telegramUserId,
    orderId,
    tbankPaymentId: String(invId),
    serviceType: "master_home_visit",
    amountRub,
    status: "pending",
    qrPayload: paymentUrl,
    qrImage: null,
    leadPayload: {
      kind: "install",
      requestId: request.id,
      publicCode: request.publicCode ?? null,
    },
    requestId: request.id,
  });
}

/**
 * Side effects after a master accepts a request: payment link + customer notify.
 * Safe to call from HTTP accept and Telegram webhook — errors are logged, not thrown.
 */
export async function afterInstallRequestAccepted(
  requestId: string,
): Promise<{ paymentUrl: string | null }> {
  const existing = await getInstallRequestById(requestId);
  if (!existing || existing.status !== "payment") {
    return { paymentUrl: null };
  }

  let paymentUrl: string | null = null;
  let amountRub: number | null = null;
  try {
    const payment = await ensureInstallRequestPayment(existing);
    paymentUrl = payment?.qrPayload ?? null;
    amountRub = payment?.amountRub ?? null;
  } catch (error) {
    console.error("ensureInstallRequestPayment", error);
  }

  if (amountRub == null) {
    try {
      amountRub = await resolveInstallRequestVisitAmountRub(existing);
    } catch (error) {
      console.error("resolveInstallRequestVisitAmountRub", error);
    }
  }

  const ownerStorageId = existing.telegramUserId;
  if (!isPhoneAuthStorageId(ownerStorageId)) {
    try {
      await notifyCustomerMasterAccepted(
        toTelegramChatId(ownerStorageId),
        existing,
        paymentUrl,
        amountRub ?? undefined,
      );
    } catch (error) {
      console.error("notifyCustomerMasterAccepted", error);
    }
  } else {
    console.warn(
      "skip telegram payment notify for phone-auth owner",
      ownerStorageId,
    );
  }

  try {
    await notifyUserWebPush(ownerStorageId, {
      title: "Током",
      body: paymentUrl
        ? "Мастер принял заявку — оплатите выезд, чтобы он приступил к работе"
        : "Мастер принял вашу заявку — откройте приложение для оплаты",
      url: "/",
    });
  } catch (error) {
    console.error("notifyUserWebPush after accept", error);
  }

  return { paymentUrl };
}
