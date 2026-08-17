import { ensureSchema, getSbpPaymentByTbankId, updateSbpPayment } from "@/lib/db";
import { fulfillSbpByTbankPaymentId } from "@/lib/sbp-fulfill";
import { isYooKassaConfigured, yooKassaGetPayment, mapYooKassaStatus } from "@/lib/yookassa";

function ok(): Response {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  try {
    if (!isYooKassaConfigured()) return ok();

    const body = (await request.json()) as {
      event?: string;
      object?: { id?: string };
    };
    const paymentId = body.object?.id?.trim();
    if (!paymentId) return ok();

    // Do not trust the webhook payload: re-read the payment from YooKassa.
    const remote = await yooKassaGetPayment(paymentId);
    const mapped = mapYooKassaStatus(remote.status, remote.paid);

    await ensureSchema();
    if (mapped === "confirmed") {
      await fulfillSbpByTbankPaymentId(paymentId);
      return ok();
    }
    if (mapped === "failed") {
      const payment = await getSbpPaymentByTbankId(paymentId);
      if (payment?.status === "pending") {
        await updateSbpPayment(payment.id, { status: "failed" });
      }
    }
    return ok();
  } catch (error) {
    console.error("YooKassa notify failed", error);
    return ok();
  }
}
