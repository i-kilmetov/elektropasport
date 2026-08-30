/** Canonical production site URL (custom domain). */
export const PRODUCTION_APP_URL = "https://tokom.ru";

/** Production host that serves the app without redirect (Vercel apex → www). */
export const PRODUCTION_WEBHOOK_ORIGIN = "https://www.tokom.ru";

/** Staging subdomain — same deployment, password gate + new features. */
export const TEST_APP_URL = "https://test.tokom.ru";

/** Old production host — same Vercel project / same DB as tokom.ru. */
export const LEGACY_VERCEL_HOST = "elektropasport.vercel.app";

/**
 * Origin for Telegram setWebhook — must not 308 to another host or
 * X-Telegram-Bot-Api-Secret-Token is dropped on redirect.
 */
export function productionWebhookOrigin(request?: Request): string {
  const fromEnv =
    process.env.TELEGRAM_WEBHOOK_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) {
    try {
      const host = new URL(fromEnv.replace(/\/$/, "")).host.toLowerCase();
      if (host === "tokom.ru") {
        return PRODUCTION_WEBHOOK_ORIGIN;
      }
    } catch {
      // fall through
    }
    return fromEnv.replace(/\/$/, "");
  }

  if (request) {
    const origin = resolveRequestOrigin(request);
    try {
      const host = new URL(origin).host.toLowerCase();
      if (host === "tokom.ru" || host === "www.tokom.ru") {
        return PRODUCTION_WEBHOOK_ORIGIN;
      }
    } catch {
      // fall through
    }
    return origin;
  }

  return PRODUCTION_WEBHOOK_ORIGIN;
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
 * Origin for Telegram OIDC redirect_uri.
 * Apex and www must map to the same registered URL in BotFather
 * (currently https://tokom.ru/... — www alone returns "redirect_uri required").
 */
export function resolveOAuthOrigin(request: Request): string {
  const origin = resolveRequestOrigin(request);
  try {
    const host = new URL(origin).host.toLowerCase();
    if (host === "www.tokom.ru" || host === "tokom.ru") {
      return PRODUCTION_APP_URL;
    }
  } catch {
    // fall through
  }
  return origin;
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
