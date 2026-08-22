/** Canonical production site URL (custom domain). */
export const PRODUCTION_APP_URL = "https://tokom.ru";

/** Staging subdomain — same deployment, password gate + new features. */
export const TEST_APP_URL = "https://test.tokom.ru";

/** Old production host — same Vercel project / same DB as tokom.ru. */
export const LEGACY_VERCEL_HOST = "elektropasport.vercel.app";

export function productionAppHost(): string {
  return "tokom.ru";
}

/**
 * Origin of the HTTP request the browser actually hit.
 * Must be used for OAuth redirect_uri + PKCE cookies (host must match).
 */
export function resolveRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ??
    url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host;
  return `${proto}://${host}`;
}

/**
 * Prefer an explicit env override, then the current request / Vercel URL,
 * then the public tokom.ru domain.
 * Use for links, webhooks, payments — not for OAuth cookie/redirect host.
 */
export function resolveAppOrigin(request?: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (request) {
    return resolveRequestOrigin(request);
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  return PRODUCTION_APP_URL;
}
