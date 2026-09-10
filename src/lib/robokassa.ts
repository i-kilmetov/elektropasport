import { createHash, timingSafeEqual } from "crypto";

const PAYMENT_URL = "https://auth.robokassa.ru/Merchant/Index.aspx";

export type RobokassaShp = Record<string, string>;

type HashAlg = "md5" | "sha256" | "sha512" | "sha1";

function hashAlg(): HashAlg {
  const raw = (process.env.ROBOKASSA_HASH_ALG ?? "md5").trim().toLowerCase();
  if (
    raw === "md5" ||
    raw === "sha256" ||
    raw === "sha512" ||
    raw === "sha1"
  ) {
    return raw;
  }
  return "md5";
}

function digest(value: string): string {
  return createHash(hashAlg()).update(value, "utf8").digest("hex");
}

function merchantLogin(): string {
  const login = process.env.ROBOKASSA_MERCHANT_LOGIN?.trim() ?? "";
  if (!login) throw new Error("Robokassa не настроена");
  return login;
}

export function isRobokassaTestMode(): boolean {
  const raw = process.env.ROBOKASSA_IS_TEST?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Password #1 — payment links + SuccessURL signatures. */
function password1(): string {
  if (isRobokassaTestMode()) {
    const test =
      process.env.ROBOKASSA_TEST_PASSWORD1?.trim() ||
      process.env.ROBOKASSA_PASSWORD1?.trim() ||
      "";
    if (test) return test;
  }
  const value = process.env.ROBOKASSA_PASSWORD1?.trim() ?? "";
  if (!value) throw new Error("Robokassa не настроена");
  return value;
}

/** Password #2 — ResultURL signatures. */
function password2(): string {
  if (isRobokassaTestMode()) {
    const test =
      process.env.ROBOKASSA_TEST_PASSWORD2?.trim() ||
      process.env.ROBOKASSA_PASSWORD2?.trim() ||
      "";
    if (test) return test;
  }
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

export function formatRobokassaOutSum(amountRub: number): string {
  return amountRub.toFixed(2);
}

/** Compare OutSum from Robokassa (may be 220, 220.00, 220.000000). */
export function robokassaOutSumsMatch(
  received: string,
  expectedRub: number,
): boolean {
  const normalize = (raw: string) =>
    Number(String(raw).trim().replace(",", "."));
  const a = normalize(received);
  const b = Number(expectedRub);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < 0.005;
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

/**
 * Payment SignatureValue.
 * Modifiers (Receipt, StepByStep, ResultUrl2, SuccessUrl2, …) go between InvId
 * and Password#1, only when present, in Robokassa’s fixed order.
 * SuccessUrl2 / FailUrl2 values in the signature string must be URL-encoded.
 */
export function buildRobokassaPaymentSignature(input: {
  outSum: string;
  invId: number;
  shp?: RobokassaShp;
  successUrl2?: string;
  successUrl2Method?: "GET" | "POST";
  failUrl2?: string;
  failUrl2Method?: "GET" | "POST";
}): string {
  const parts = [merchantLogin(), input.outSum, String(input.invId)];
  if (input.successUrl2?.trim()) {
    parts.push(encodeURIComponent(input.successUrl2.trim()));
    parts.push(input.successUrl2Method ?? "GET");
  }
  if (input.failUrl2?.trim()) {
    parts.push(encodeURIComponent(input.failUrl2.trim()));
    parts.push(input.failUrl2Method ?? "GET");
  }
  parts.push(password1());
  return digest(appendShp(parts.join(":"), input.shp));
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
  return signaturesEqual(digest(base), input.signatureValue);
}

/** SuccessURL uses Password #1 (same as payment link). */
export function verifyRobokassaSuccessSignature(input: {
  outSum: string;
  invId: string;
  signatureValue: string;
  shp?: RobokassaShp;
}): boolean {
  if (!isRobokassaConfigured()) return false;
  const base = appendShp(
    `${input.outSum}:${input.invId}:${password1()}`,
    input.shp,
  );
  return signaturesEqual(digest(base), input.signatureValue);
}

/** Force https on public return URLs (cabinet often has http://…). */
export function robokassaHttpsUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      parsed.protocol === "http:"
    ) {
      parsed.protocol = "https:";
    }
    return parsed.toString().replace(/\/$/, "") === parsed.origin
      ? parsed.origin
      : parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

/**
 * Browser return path after pay. Must be SuccessUrl2 (not SuccessURL):
 * cabinet SuccessURL wins unless SuccessUrl2 is signed into the payment link.
 */
export function robokassaBrowserReturnUrl(origin: string): string {
  const base = robokassaHttpsUrl(origin.replace(/\/$/, ""));
  return `${base}/pay/return`;
}

export function buildRobokassaPaymentUrl(input: {
  invId: number;
  amountRub: number;
  description: string;
  /** @deprecated Prefer successUrl2 — plain SuccessURL is ignored when cabinet has its own. */
  successUrl?: string;
  /** @deprecated Prefer failUrl2 */
  failUrl?: string;
  successUrl2?: string;
  failUrl2?: string;
  shp?: RobokassaShp;
}): string {
  const outSum = formatRobokassaOutSum(input.amountRub);
  const successUrl2 = robokassaHttpsUrl(
    (input.successUrl2 ?? input.successUrl ?? "").trim(),
  );
  const failUrl2 = robokassaHttpsUrl(
    (input.failUrl2 ?? input.failUrl ?? successUrl2).trim(),
  );
  const successUrl2Method = "GET" as const;
  const failUrl2Method = "GET" as const;

  const signature = buildRobokassaPaymentSignature({
    outSum,
    invId: input.invId,
    shp: input.shp,
    ...(successUrl2
      ? { successUrl2, successUrl2Method, failUrl2, failUrl2Method }
      : {}),
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
  // SuccessUrl2 overrides cabinet SuccessURL (must be in SignatureValue).
  if (successUrl2) {
    params.set("SuccessUrl2", successUrl2);
    params.set("SuccessUrl2Method", successUrl2Method);
    params.set("FailUrl2", failUrl2);
    params.set("FailUrl2Method", failUrl2Method);
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
