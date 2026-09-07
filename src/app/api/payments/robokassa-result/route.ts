import { ensureSchema, getSbpPaymentByTbankId } from "@/lib/db";
import { fulfillSbpByTbankPaymentId } from "@/lib/sbp-fulfill";
import {
  isRobokassaConfigured,
  isRobokassaTestMode,
  parseRobokassaShp,
  robokassaOutSumsMatch,
  robokassaResultOkResponse,
  verifyRobokassaResultSignature,
} from "@/lib/robokassa";

function hasRobokassaCallbackParams(params: URLSearchParams): boolean {
  return Boolean(
    params.get("OutSum")?.trim() ||
      params.get("InvId")?.trim() ||
      params.get("SignatureValue")?.trim(),
  );
}

async function handleResult(params: URLSearchParams): Promise<Response> {
  if (!isRobokassaConfigured()) {
    console.error("Robokassa result: not configured");
    return robokassaResultOkResponse(params.get("InvId") ?? "");
  }

  const outSum = params.get("OutSum")?.trim() ?? "";
  const invId = params.get("InvId")?.trim() ?? "";
  const signatureValue = params.get("SignatureValue")?.trim() ?? "";

  if (!outSum || !invId || !signatureValue) {
    console.error("Robokassa result: missing fields", {
      hasOutSum: Boolean(outSum),
      hasInvId: Boolean(invId),
      hasSig: Boolean(signatureValue),
    });
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
    console.error("Robokassa result signature mismatch", {
      invId,
      outSum,
      shpKeys: shp ? Object.keys(shp) : [],
    });
    return new Response("bad signature", { status: 403 });
  }

  await ensureSchema();
  const payment = await getSbpPaymentByTbankId(invId);
  if (!payment) {
    console.error("Robokassa result: payment not found", { invId });
    // Still OK so Robokassa stops retrying unknown/stale invoices.
    return robokassaResultOkResponse(invId);
  }

  if (!robokassaOutSumsMatch(outSum, payment.amountRub)) {
    console.error("Robokassa result: amount mismatch", {
      invId,
      outSum,
      expected: payment.amountRub,
    });
    return new Response("bad amount", { status: 400 });
  }

  if (payment.status === "pending") {
    try {
      await fulfillSbpByTbankPaymentId(invId);
    } catch (error) {
      console.error("Robokassa result fulfill failed", { invId, error });
      return new Response("error", { status: 500 });
    }
  }

  return robokassaResultOkResponse(invId);
}

/** Browser probe without Robokassa params — not an error. */
function probeResponse(): Response {
  return Response.json({
    ok: true,
    endpoint: "robokassa-result",
    configured: isRobokassaConfigured(),
    testMode: isRobokassaTestMode(),
    message:
      "Result URL жив. Открытие в браузере без параметров — не ошибка оплаты: Robokassa должна слать OutSum, InvId и SignatureValue. Настройки: /api/payments/robokassa-status",
  });
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (!hasRobokassaCallbackParams(params)) {
      return probeResponse();
    }
    return await handleResult(params);
  } catch (error) {
    console.error("Robokassa result GET failed", error);
    return new Response("error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const params = new URLSearchParams();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (body) {
        for (const [key, value] of Object.entries(body)) {
          if (value != null) params.set(key, String(value));
        }
      }
    } else {
      const form = await request.formData();
      form.forEach((value, key) => {
        params.set(key, String(value));
      });
    }
    // Some gateways also put fields on the query string.
    new URL(request.url).searchParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
    if (!hasRobokassaCallbackParams(params)) {
      return probeResponse();
    }
    return await handleResult(params);
  } catch (error) {
    console.error("Robokassa result POST failed", error);
    return new Response("error", { status: 500 });
  }
}
