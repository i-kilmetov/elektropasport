export const TEST_SITE_COOKIE = "test-site-auth-v2";
export const TEST_SITE_INACTIVITY_MS = 10 * 60 * 1000;
const TEST_SITE_COOKIE_VALUE = "ok";

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

export async function signTestSiteCookie(): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const sig = await hmacSha256Base64Url(secret, TEST_SITE_COOKIE_VALUE);
  return `${TEST_SITE_COOKIE_VALUE}.${sig}`;
}

export async function verifyTestSiteCookie(
  value: string | null | undefined,
): Promise<boolean> {
  if (!value) return false;
  const expected = await signTestSiteCookie();
  if (!expected) return false;
  const enc = new TextEncoder();
  return bytesEqual(enc.encode(value), enc.encode(expected));
}

export function verifyTestSitePassword(password: string): boolean {
  const expected = process.env.TEST_SITE_PASSWORD?.trim();
  if (!expected) return false;
  const enc = new TextEncoder();
  return bytesEqual(enc.encode(password), enc.encode(expected));
}
