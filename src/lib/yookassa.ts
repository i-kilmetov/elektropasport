import { randomUUID } from "crypto";

const API_URL = "https://api.yookassa.ru/v3";

export type YooKassaPaymentStatus =
  | "pending"
  | "waiting_for_capture"
  | "succeeded"
  | "canceled";

type YooKassaAmount = {
  value: string;
  currency: string;
};

type YooKassaConfirmation = {
  type?: string;
  confirmation_url?: string;
  confirmation_data?: string;
  return_url?: string;
};

export type YooKassaPayment = {
  id: string;
  status: YooKassaPaymentStatus | string;
  paid?: boolean;
  amount?: YooKassaAmount;
  description?: string;
  confirmation?: YooKassaConfirmation;
  metadata?: Record<string, string>;
  cancellation_details?: { party?: string; reason?: string };
};

function credentials(): { shopId: string; secretKey: string } {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? "";
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim() ?? "";
  if (!shopId || !secretKey) {
    throw new Error("ЮKassa не настроена");
  }
  return { shopId, secretKey };
}

export function isYooKassaConfigured(): boolean {
  return Boolean(
    process.env.YOOKASSA_SHOP_ID?.trim() &&
      process.env.YOOKASSA_SECRET_KEY?.trim(),
  );
}

function authHeader(): string {
  const { shopId, secretKey } = credentials();
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

function formatAmount(amountRub: number): string {
  return amountRub.toFixed(2);
}

export function yooKassaReturnUrl(): string {
  const explicit = process.env.YOOKASSA_RETURN_URL?.trim();
  if (explicit) return explicit;
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  const app = process.env.NEXT_PUBLIC_TELEGRAM_MINI_APP_NAME?.trim();
  if (bot && app) return `https://t.me/${bot}/${app}`;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (host) return `https://${host}`;
  return "https://elektropasport.vercel.app";
}

async function yooKassaRequest(
  path: string,
  init?: {
    method?: string;
    body?: unknown;
    idempotenceKey?: string;
  },
): Promise<YooKassaPayment> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
  };
  if (init?.idempotenceKey) {
    headers["Idempotence-Key"] = init.idempotenceKey;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  const data = (await res.json()) as YooKassaPayment & {
    type?: string;
    description?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(data.description || `ЮKassa ${res.status}`);
  }
  return data;
}

export async function yooKassaCreateSbpPayment(input: {
  orderId: string;
  amountRub: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{
  paymentId: string;
  status: string;
  confirmationUrl: string;
}> {
  const payment = await yooKassaRequest("/payments", {
    method: "POST",
    idempotenceKey: input.orderId || randomUUID(),
    body: {
      amount: {
        value: formatAmount(input.amountRub),
        currency: "RUB",
      },
      capture: true,
      description: input.description.slice(0, 128),
      payment_method_data: { type: "sbp" },
      confirmation: {
        type: "redirect",
        return_url: yooKassaReturnUrl(),
      },
      metadata: input.metadata,
    },
  });

  const confirmationUrl = payment.confirmation?.confirmation_url?.trim() ?? "";
  if (!payment.id || !confirmationUrl) {
    throw new Error("ЮKassa не вернула ссылку на оплату СБП");
  }

  return {
    paymentId: payment.id,
    status: payment.status,
    confirmationUrl,
  };
}

export async function yooKassaGetPayment(
  paymentId: string,
): Promise<YooKassaPayment> {
  return yooKassaRequest(`/payments/${encodeURIComponent(paymentId)}`);
}

export function mapYooKassaStatus(
  status: string | undefined,
  paid?: boolean,
): "pending" | "confirmed" | "failed" {
  if (paid || status === "succeeded") return "confirmed";
  if (status === "canceled") return "failed";
  return "pending";
}
