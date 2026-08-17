import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getSbpPaymentById,
} from "@/lib/db";
import { refreshSbpPaymentFromBank } from "@/lib/sbp-fulfill";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    const { id } = await context.params;
    if (!id) {
      return Response.json({ error: "Нет идентификатора платежа" }, { status: 400 });
    }

    let payment = await getSbpPaymentById(id, user.telegramId);
    if (!payment) {
      return Response.json({ error: "Платёж не найден" }, { status: 404 });
    }

    if (payment.status === "pending") {
      try {
        payment = await refreshSbpPaymentFromBank(payment);
      } catch (error) {
        console.error("Failed to refresh SBP payment", error);
      }
    }

    return Response.json({
      id: payment.id,
      amountRub: payment.amountRub,
      status: payment.status,
      qrPayload: payment.qrPayload,
      qrImage: payment.qrImage,
      tbankPaymentId: payment.tbankPaymentId,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
