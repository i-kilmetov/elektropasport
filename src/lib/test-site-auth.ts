import { createHmac, timingSafeEqual } from "crypto";

export const TEST_SITE_COOKIE = "test-site-auth";
const TEST_SITE_COOKIE_VALUE = "ok";

function authSecret(): string | null {
  const secret =
    process.env.TEST_SITE_PASSWORD?.trim() ||
    process.env.TELEGRAM_SETUP_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.BOT_TOKEN?.trim();
  return secret || null;
}

export function testSitePasswordConfigured(): boolean {
  return Boolean(
    process.env.TEST_SITE_PASSWORD?.trim() ||
      process.env.TELEGRAM_SETUP_KEY?.trim(),
  );
}

export function verifyTestSitePassword(password: string): boolean {
  const expected =
    process.env.TEST_SITE_PASSWORD?.trim() ||
    process.env.TELEGRAM_SETUP_KEY?.trim();
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signTestSiteCookie(): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const sig = createHmac("sha256", secret)
    .update(TEST_SITE_COOKIE_VALUE)
    .digest("base64url");
  return `${TEST_SITE_COOKIE_VALUE}.${sig}`;
}

export function verifyTestSiteCookie(value: string | null | undefined): boolean {
  if (!value) return false;
  const expected = signTestSiteCookie();
  if (!expected) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
