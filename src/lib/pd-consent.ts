/** Bump when consent text or linked documents change materially. */
export const PD_CONSENT_VERSION = "1.1";

export const PD_CONSENT_COOKIE = "ep_pd_consent";

/** OAuth flow: consent must be given within this window (seconds). */
export const PD_CONSENT_COOKIE_MAX_AGE = 3600;

export function pdConsentCookieHeader(version: string = PD_CONSENT_VERSION): string {
  return `${PD_CONSENT_COOKIE}=${encodeURIComponent(version)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${PD_CONSENT_COOKIE_MAX_AGE}`;
}

export function pdConsentCookieClearHeader(): string {
  return `${PD_CONSENT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readPdConsentCookie(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PD_CONSENT_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(PD_CONSENT_COOKIE.length + 1));
  return value || null;
}

export function isPdConsentCookieValid(version: string | null): boolean {
  return version === PD_CONSENT_VERSION;
}
