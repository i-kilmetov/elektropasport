import { ensureSchema } from "@/lib/db";
import { fulfillSbpByTbankPaymentId } from "@/lib/sbp-fulfill";
import {
  isPaidTBankStatus,
  mapTBankStatus,
  verifyTBankNotification,
} from "@/lib/tbank";
import { updateSbpPayment, getSbpPaymentByTbankId } from "@/lib/db";

function ok(): Response {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!verifyTBankNotification(body)) {
      return Response.json({ error: "Неверная подпись" }, { status: 401 });
    }

    await ensureSchema();
    const paymentId = body.PaymentId != null ? String(body.PaymentId) : "";
    const status = typeof body.Status === "string" ? body.Status : "";
    if (!paymentId) return ok();

    const mapped = mapTBankStatus(status);
    if (mapped === "confirmed" || isPaidTBankStatus(status)) {
      await fulfillSbpByTbankPaymentId(paymentId);
      return ok();
    }

    if (mapped === "failed") {
      const payment = await getSbpPaymentByTbankId(paymentId);
      if (payment && payment.status === "pending") {
        await updateSbpPayment(payment.id, { status: "failed" });
      }
    }

    return ok();
  } catch (error) {
    console.error("T-Bank notify failed", error);
    return ok();
  }
}
