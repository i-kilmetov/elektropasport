export const TEST_SITE_COOKIE = "test-site-auth-v3";
/** Require password again after this much idle time (sliding window on each request). */
export const TEST_SITE_INACTIVITY_MS = 2 * 60 * 60 * 1000;
export const TEST_SITE_MAX_FAILED_ATTEMPTS = 5;
/** After every batch of failed attempts: 1 h, 2 h, … up to 12 h. */
export const TEST_SITE_LOCKOUT_BASE_MS = 60 * 60 * 1000;
export const TEST_SITE_LOCKOUT_MAX_MS = 12 * 60 * 60 * 1000;

const TEST_SITE_COOKIE_PREFIX = "v3";

export type TestSiteCookieStatus =
  | { ok: true; lastActivityMs: number }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

function authSecret(): string | null {
  return process.env.TEST_SITE_PASSWORD?.trim() || null;
}

export function testSitePasswordConfigured(): boolean {
  return Boolean(process.env.TEST_SITE_PASSWORD?.trim());
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256Base64Url(
  secret: string,
  message: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function hashTestSiteClientKey(
  value: string,
  scope: string,
): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  return hmacSha256Base64Url(secret, `${scope}:${value}`);
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function signTestSiteCookie(
  lastActivityMs = Date.now(),
): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const payload = `${TEST_SITE_COOKIE_PREFIX}.${lastActivityMs}`;
  const sig = await hmacSha256Base64Url(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyTestSiteCookie(
  value: string | null | undefined,
): Promise<TestSiteCookieStatus> {
  if (!value) return { ok: false, reason: "missing" };

  const parts = value.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };

  const [prefix, tsRaw, sig] = parts;
  if (prefix !== TEST_SITE_COOKIE_PREFIX || !sig) {
    return { ok: false, reason: "invalid" };
  }

  const lastActivityMs = Number(tsRaw);
  if (!Number.isFinite(lastActivityMs) || lastActivityMs <= 0) {
    return { ok: false, reason: "invalid" };
  }

  const token = await signTestSiteCookie(lastActivityMs);
  if (!token) return { ok: false, reason: "invalid" };

  const enc = new TextEncoder();
  if (!bytesEqual(enc.encode(value), enc.encode(token))) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() - lastActivityMs > TEST_SITE_INACTIVITY_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, lastActivityMs };
}

export function verifyTestSitePassword(password: string): boolean {
  const expected = process.env.TEST_SITE_PASSWORD?.trim();
  if (!expected) return false;
  const enc = new TextEncoder();
  return bytesEqual(enc.encode(password), enc.encode(expected));
}

export function lockoutDurationMs(level: number): number {
  const hours = Math.min(Math.max(level, 1), 12);
  return hours * TEST_SITE_LOCKOUT_BASE_MS;
}

export function formatRetryAfterMs(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  if (totalMin < 60) return `${totalMin} мин.`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hours} ч.`;
  return `${hours} ч ${mins} мин.`;
}

export function testSiteCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
