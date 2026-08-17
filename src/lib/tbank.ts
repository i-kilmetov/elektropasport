import { createHash } from "crypto";

const DEFAULT_API_URL = "https://securepay.tinkoff.ru/v2";

export type TBankPaymentStatus =
  | "NEW"
  | "FORM_SHOWED"
  | "DEADLINE_EXPIRED"
  | "CANCELED"
  | "REJECTED"
  | "AUTH_FAIL"
  | "AUTHORIZED"
  | "CONFIRMING"
  | "CONFIRMED"
  | "REFUNDED"
  | "PARTIAL_REFUNDED"
  | "REVERSED"
  | string;

type TBankResponse = {
  Success?: boolean;
  ErrorCode?: string;
  Message?: string;
  Details?: string;
  PaymentId?: number | string;
  OrderId?: string;
  Status?: TBankPaymentStatus;
  Amount?: number;
  PaymentURL?: string;
  Data?: string;
};

export function isTBankConfigured(): boolean {
  return Boolean(
    process.env.TBANK_TERMINAL_KEY?.trim() &&
      process.env.TBANK_TERMINAL_PASSWORD?.trim(),
  );
}

function apiUrl(): string {
  return (process.env.TBANK_API_URL?.trim() || DEFAULT_API_URL).replace(
    /\/$/,
    "",
  );
}

function credentials(): { terminalKey: string; password: string } {
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim() ?? "";
  const password = process.env.TBANK_TERMINAL_PASSWORD?.trim() ?? "";
  if (!terminalKey || !password) {
    throw new Error("Терминал Т-Банка не настроен");
  }
  return { terminalKey, password };
}

export function tbankNotificationUrl(): string | null {
  const explicit = process.env.TBANK_NOTIFICATION_URL?.trim();
  if (explicit) return explicit;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (host) return `https://${host}/api/payments/tbank-notify`;
  return null;
}

/** SHA-256 token: sort scalar keys + Password, concat values. */
export function tbankToken(
  params: Record<string, unknown>,
  password: string,
): string {
  const scalars: Record<string, string> = { Password: password };
  for (const [key, value] of Object.entries(params)) {
    if (key === "Token" || value == null) continue;
    if (typeof value === "object") continue;
    if (typeof value === "boolean") {
      scalars[key] = value ? "true" : "false";
    } else {
      scalars[key] = String(value);
    }
  }
  const concat = Object.keys(scalars)
    .sort()
    .map((key) => scalars[key])
    .join("");
  return createHash("sha256").update(concat).digest("hex");
}

export function verifyTBankNotification(
  body: Record<string, unknown>,
): boolean {
  const password = process.env.TBANK_TERMINAL_PASSWORD?.trim();
  const terminalKey = process.env.TBANK_TERMINAL_KEY?.trim();
  if (!password || !terminalKey) return false;
  const token = typeof body.Token === "string" ? body.Token : "";
  if (!token) return false;
  const expected = tbankToken(body, password);
  return expected.toLowerCase() === token.toLowerCase();
}

async function tbankRequest(
  method: string,
  params: Record<string, unknown>,
): Promise<TBankResponse> {
  const { terminalKey, password } = credentials();
  const payload: Record<string, unknown> = {
    ...params,
    TerminalKey: terminalKey,
  };
  payload.Token = tbankToken(payload, password);

  const res = await fetch(`${apiUrl()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as TBankResponse;
  if (!res.ok || data.Success === false || (data.ErrorCode && data.ErrorCode !== "0")) {
    const message =
      data.Details || data.Message || `Т-Банк ${method} (${data.ErrorCode ?? res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function tbankInit(input: {
  orderId: string;
  amountKopecks: number;
  description: string;
  notificationUrl?: string | null;
  phone?: string;
}): Promise<{ paymentId: string; status: TBankPaymentStatus }> {
  const params: Record<string, unknown> = {
    Amount: input.amountKopecks,
    OrderId: input.orderId,
    Description: input.description.slice(0, 140),
    PayType: "O",
    Language: "ru",
  };
  if (input.notificationUrl) {
    params.NotificationURL = input.notificationUrl;
  }
  if (input.phone) {
    params.DATA = { Phone: input.phone };
  }

  const data = await tbankRequest("Init", params);
  const paymentId = data.PaymentId != null ? String(data.PaymentId) : "";
  if (!paymentId) throw new Error("Т-Банк не вернул PaymentId");
  return { paymentId, status: data.Status ?? "NEW" };
}

export async function tbankGetQr(paymentId: string): Promise<{
  payload: string;
  image?: string;
}> {
  const payloadRes = await tbankRequest("GetQr", {
    PaymentId: paymentId,
    DataType: "PAYLOAD",
  });
  const payload = payloadRes.Data?.trim() ?? "";
  if (!payload) throw new Error("Т-Банк не вернул QR СБП");

  let image: string | undefined;
  try {
    const imageRes = await tbankRequest("GetQr", {
      PaymentId: paymentId,
      DataType: "IMAGE",
    });
    image = imageRes.Data?.trim() || undefined;
  } catch (error) {
    console.error("T-Bank GetQr IMAGE failed", error);
  }

  return { payload, image };
}

export async function tbankGetState(paymentId: string): Promise<{
  status: TBankPaymentStatus;
  amount?: number;
}> {
  const data = await tbankRequest("GetState", { PaymentId: paymentId });
  return { status: data.Status ?? "NEW", amount: data.Amount };
}

export function isPaidTBankStatus(status: string | undefined): boolean {
  return status === "CONFIRMED" || status === "AUTHORIZED";
}

export function isFailedTBankStatus(status: string | undefined): boolean {
  return (
    status === "REJECTED" ||
    status === "CANCELED" ||
    status === "DEADLINE_EXPIRED" ||
    status === "AUTH_FAIL" ||
    status === "REVERSED"
  );
}

export function mapTBankStatus(
  status: string | undefined,
): "pending" | "confirmed" | "failed" {
  if (isPaidTBankStatus(status)) return "confirmed";
  if (isFailedTBankStatus(status)) return "failed";
  return "pending";
}
