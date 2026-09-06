import { randomBytes } from "crypto";
import { isPhoneAuthStorageId } from "@/lib/phone-auth";
import { toTelegramChatId } from "@/lib/app-env";
import { PRODUCTION_APP_URL, TEST_APP_URL } from "@/lib/app-url";
import {
  getInstallRequestById,
  getPendingSbpPaymentByRequestId,
  insertSbpPayment,
  type SbpPaymentRecord,
} from "@/lib/db";
import { MASTER_HOME_VISIT_PRICE_RUB } from "@/lib/lead-services";
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

/**
 * Create (or reuse) a Robokassa payment link for an accepted install request.
 */
export async function ensureInstallRequestPayment(
  request: InstallRequest & { telegramUserId: number },
): Promise<SbpPaymentRecord | null> {
  if (!isRobokassaConfigured()) return null;
  if (request.status !== "payment" && request.status !== "new") return null;

  const existing = await getPendingSbpPaymentByRequestId(request.id);
  if (existing?.qrPayload) return existing;

  const amountRub = MASTER_HOME_VISIT_PRICE_RUB;
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
  try {
    const payment = await ensureInstallRequestPayment(existing);
    paymentUrl = payment?.qrPayload ?? null;
  } catch (error) {
    console.error("ensureInstallRequestPayment", error);
  }

  const ownerStorageId = existing.telegramUserId;
  if (!isPhoneAuthStorageId(ownerStorageId)) {
    try {
      await notifyCustomerMasterAccepted(
        toTelegramChatId(ownerStorageId),
        existing,
        paymentUrl,
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
