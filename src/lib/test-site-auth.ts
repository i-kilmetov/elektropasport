export const TEST_SITE_INACTIVITY_MS = 10 * 60 * 1000;

export function testSitePasswordConfigured(): boolean {
  return Boolean(
    process.env.TEST_SITE_PASSWORD?.trim() ||
      process.env.TELEGRAM_SETUP_KEY?.trim(),
  );
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function verifyTestSitePassword(password: string): boolean {
  const expected =
    process.env.TEST_SITE_PASSWORD?.trim() ||
    process.env.TELEGRAM_SETUP_KEY?.trim();
  if (!expected) return false;
  const enc = new TextEncoder();
  return bytesEqual(enc.encode(password), enc.encode(expected));
}
