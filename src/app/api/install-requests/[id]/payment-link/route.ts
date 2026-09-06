import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getInstallRequestById,
  getPendingSbpPaymentByRequestId,
  upsertUser,
} from "@/lib/db";
import {
  appEnvFromRequest,
  toStorageTelegramId,
  toTelegramChatId,
} from "@/lib/app-env";
import { ensureInstallRequestPayment } from "@/lib/install-request-accept";
import { MASTER_VISIT_MIN_PRICE_RUB } from "@/lib/lead-services";
import { isPhoneAuthStorageId } from "@/lib/phone-auth";
import { notifyCustomerMasterAccepted } from "@/lib/telegram-notify";

type RouteContext = { params: Promise<{ id: string }> };

/** Owner creates/fetches Robokassa URL for an accepted (payment) install request. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const existing = await getInstallRequestById(id);
    if (!existing) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    const storageId = toStorageTelegramId(
      user.telegramId,
      appEnvFromRequest(request),
    );
    if (Math.abs(existing.telegramUserId) !== Math.abs(storageId)) {
      return Response.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (existing.status !== "payment") {
      return Response.json(
        { error: "Заявка не ожидает оплаты" },
        { status: 400 },
      );
    }

    const hadPayment = Boolean(
      await getPendingSbpPaymentByRequestId(existing.id),
    );
    const payment = await ensureInstallRequestPayment(existing);
    if (!payment?.qrPayload) {
      return Response.json(
        { error: "Оплата пока не настроена" },
        { status: 503 },
      );
    }

    // Heal: if accept never notified the customer, send the link now.
    if (!hadPayment && !isPhoneAuthStorageId(existing.telegramUserId)) {
      try {
        await notifyCustomerMasterAccepted(
          toTelegramChatId(existing.telegramUserId),
          existing,
          payment.qrPayload,
          payment.amountRub,
        );
      } catch (error) {
        console.error("payment-link notifyCustomerMasterAccepted", error);
      }
    }

    return Response.json({
      paymentUrl: payment.qrPayload,
      amountRub: payment.amountRub ?? MASTER_VISIT_MIN_PRICE_RUB,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
