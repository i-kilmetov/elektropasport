import { ensureSchema, getSbpPaymentByTbankId } from "@/lib/db";
import { fulfillSbpByTbankPaymentId } from "@/lib/sbp-fulfill";
import {
  isRobokassaConfigured,
  parseRobokassaShp,
  robokassaOutSumsMatch,
  verifyRobokassaSuccessSignature,
} from "@/lib/robokassa";

/**
 * Fallback when ResultURL did not run (common in test / misconfigured shop).
 * SuccessURL redirects the browser here with InvId + SignatureValue (Password #1).
 */
async function handleSuccess(params: URLSearchParams): Promise<Response> {
  if (!isRobokassaConfigured()) {
    return Response.json({ error: "Robokassa не настроена" }, { status: 503 });
  }

  const outSum = params.get("OutSum")?.trim() ?? "";
  const invId = params.get("InvId")?.trim() ?? "";
  const signatureValue = params.get("SignatureValue")?.trim() ?? "";

  if (!outSum || !invId || !signatureValue) {
    return Response.json({ error: "Нет параметров оплаты" }, { status: 400 });
  }

  const shp = parseRobokassaShp(params);
  if (
    !verifyRobokassaSuccessSignature({
      outSum,
      invId,
      signatureValue,
      shp,
    })
  ) {
    console.error("Robokassa success signature mismatch", { invId });
    return Response.json({ error: "Неверная подпись" }, { status: 403 });
  }

  await ensureSchema();
  const payment = await getSbpPaymentByTbankId(invId);
  if (!payment) {
    return Response.json({ error: "Платёж не найден", invId }, { status: 404 });
  }

  if (!robokassaOutSumsMatch(outSum, payment.amountRub)) {
    return Response.json({ error: "Сумма не совпадает" }, { status: 400 });
  }

  const fulfilled =
    payment.status === "pending"
      ? await fulfillSbpByTbankPaymentId(invId)
      : payment;

  return Response.json({
    ok: true,
    invId,
    paymentId: fulfilled?.id ?? payment.id,
    status: fulfilled?.status ?? payment.status,
    serviceType: fulfilled?.serviceType ?? payment.serviceType,
    requestId: fulfilled?.requestId ?? payment.requestId,
    amountRub: fulfilled?.amountRub ?? payment.amountRub,
  });
}

export async function GET(request: Request) {
  try {
    return await handleSuccess(new URL(request.url).searchParams);
  } catch (error) {
    console.error("Robokassa success GET failed", error);
    return Response.json({ error: "Ошибка подтверждения" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const params = new URLSearchParams();
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    for (const key of [
      "OutSum",
      "InvId",
      "SignatureValue",
      "outSum",
      "invId",
      "signatureValue",
    ]) {
      const value = body[key];
      if (typeof value === "string" || typeof value === "number") {
        const canon =
          key.toLowerCase() === "outsum"
            ? "OutSum"
            : key.toLowerCase() === "invid"
              ? "InvId"
              : key.toLowerCase() === "signaturevalue"
                ? "SignatureValue"
                : key;
        params.set(canon, String(value));
      }
    }
    // Forward Shp_* from body
    for (const [key, value] of Object.entries(body)) {
      if (key.startsWith("Shp_") && value != null) {
        params.set(key, String(value));
      }
    }
    return await handleSuccess(params);
  } catch (error) {
    console.error("Robokassa success POST failed", error);
    return Response.json({ error: "Ошибка подтверждения" }, { status: 500 });
  }
}
