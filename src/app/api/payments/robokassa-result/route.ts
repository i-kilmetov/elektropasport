import { ensureSchema, getSbpPaymentByTbankId } from "@/lib/db";
import { fulfillSbpByTbankPaymentId } from "@/lib/sbp-fulfill";
import {
  isRobokassaConfigured,
  parseRobokassaShp,
  robokassaResultOkResponse,
  verifyRobokassaResultSignature,
} from "@/lib/robokassa";

async function handleResult(params: URLSearchParams): Promise<Response> {
  if (!isRobokassaConfigured()) {
    return robokassaResultOkResponse(params.get("InvId") ?? "");
  }

  const outSum = params.get("OutSum")?.trim() ?? "";
  const invId = params.get("InvId")?.trim() ?? "";
  const signatureValue = params.get("SignatureValue")?.trim() ?? "";

  if (!outSum || !invId || !signatureValue) {
    return new Response("bad request", { status: 400 });
  }

  const shp = parseRobokassaShp(params);
  if (
    !verifyRobokassaResultSignature({
      outSum,
      invId,
      signatureValue,
      shp,
    })
  ) {
    console.error("Robokassa result signature mismatch", { invId });
    return new Response("bad signature", { status: 403 });
  }

  await ensureSchema();
  const payment = await getSbpPaymentByTbankId(invId);
  if (!payment) {
    console.error("Robokassa result: payment not found", { invId });
    return robokassaResultOkResponse(invId);
  }

  const expectedOutSum = payment.amountRub.toFixed(2);
  if (outSum !== expectedOutSum) {
    console.error("Robokassa result: amount mismatch", {
      invId,
      outSum,
      expectedOutSum,
    });
    return new Response("bad amount", { status: 400 });
  }

  if (payment.status === "pending") {
    await fulfillSbpByTbankPaymentId(invId);
  }

  return robokassaResultOkResponse(invId);
}

export async function GET(request: Request) {
  try {
    return await handleResult(new URL(request.url).searchParams);
  } catch (error) {
    console.error("Robokassa result GET failed", error);
    return new Response("error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const params = new URLSearchParams();
    const form = await request.formData();
    form.forEach((value, key) => {
      params.set(key, String(value));
    });
    return await handleResult(params);
  } catch (error) {
    console.error("Robokassa result POST failed", error);
    return new Response("error", { status: 500 });
  }
}
