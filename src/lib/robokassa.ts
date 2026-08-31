import { createHash, timingSafeEqual } from "crypto";

const PAYMENT_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

export type RobokassaShp = Record<string, string>;

function md5(value: string): string {
  return createHash("md5").update(value, "utf8").digest("hex");
}

function merchantLogin(): string {
  const login = process.env.ROBOKASSA_MERCHANT_LOGIN?.trim() ?? "";
  if (!login) throw new Error("Robokassa не настроена");
  return login;
}

function password1(): string {
  const value = process.env.ROBOKASSA_PASSWORD1?.trim() ?? "";
  if (!value) throw new Error("Robokassa не настроена");
  return value;
}

function password2(): string {
  const value = process.env.ROBOKASSA_PASSWORD2?.trim() ?? "";
  if (!value) throw new Error("Robokassa не настроена");
  return value;
}

export function isRobokassaConfigured(): boolean {
  return Boolean(
    process.env.ROBOKASSA_MERCHANT_LOGIN?.trim() &&
      process.env.ROBOKASSA_PASSWORD1?.trim() &&
      process.env.ROBOKASSA_PASSWORD2?.trim(),
  );
}

export function isRobokassaTestMode(): boolean {
  const raw = process.env.ROBOKASSA_IS_TEST?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function formatRobokassaOutSum(amountRub: number): string {
  return amountRub.toFixed(2);
}

/** Unique positive invoice id for Robokassa (InvId). */
export function newRobokassaInvId(): number {
  const base = Math.floor(Date.now() / 1000);
  const suffix = Math.floor(Math.random() * 900) + 100;
  return base * 1000 + suffix;
}

function appendShp(base: string, shp?: RobokassaShp): string {
  if (!shp || Object.keys(shp).length === 0) return base;
  const parts = Object.entries(shp)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `Shp_${key}=${value}`);
  return `${base}:${parts.join(":")}`;
}

function signaturesEqual(expected: string, actual: string): boolean {
  const left = Buffer.from(expected.toLowerCase(), "utf8");
  const right = Buffer.from(actual.toLowerCase(), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function buildRobokassaPaymentSignature(input: {
  outSum: string;
  invId: number;
  shp?: RobokassaShp;
}): string {
  const base = appendShp(
    `${merchantLogin()}:${input.outSum}:${input.invId}:${password1()}`,
    input.shp,
  );
  return md5(base);
}

export function verifyRobokassaResultSignature(input: {
  outSum: string;
  invId: string;
  signatureValue: string;
  shp?: RobokassaShp;
}): boolean {
  if (!isRobokassaConfigured()) return false;
  const base = appendShp(
    `${input.outSum}:${input.invId}:${password2()}`,
    input.shp,
  );
  return signaturesEqual(md5(base), input.signatureValue);
}

export function buildRobokassaPaymentUrl(input: {
  invId: number;
  amountRub: number;
  description: string;
  successUrl?: string;
  failUrl?: string;
  shp?: RobokassaShp;
}): string {
  const outSum = formatRobokassaOutSum(input.amountRub);
  const signature = buildRobokassaPaymentSignature({
    outSum,
    invId: input.invId,
    shp: input.shp,
  });

  const params = new URLSearchParams({
    MerchantLogin: merchantLogin(),
    OutSum: outSum,
    InvId: String(input.invId),
    Description: input.description.slice(0, 100),
    SignatureValue: signature,
    Culture: "ru",
    Encoding: "utf-8",
  });

  if (isRobokassaTestMode()) {
    params.set("IsTest", "1");
  }
  if (input.successUrl?.trim()) {
    params.set("SuccessURL", input.successUrl.trim());
  }
  if (input.failUrl?.trim()) {
    params.set("FailURL", input.failUrl.trim());
  }

  for (const [key, value] of Object.entries(input.shp ?? {})) {
    params.set(`Shp_${key}`, value);
  }

  return `${PAYMENT_URL}?${params.toString()}`;
}

export function parseRobokassaShp(
  params: URLSearchParams,
): RobokassaShp | undefined {
  const shp: RobokassaShp = {};
  params.forEach((value, key) => {
    if (key.startsWith("Shp_")) {
      shp[key.slice(4)] = value;
    }
  });
  return Object.keys(shp).length > 0 ? shp : undefined;
}

export function robokassaResultOkResponse(invId: string | number): Response {
  return new Response(`OK${invId}`, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
