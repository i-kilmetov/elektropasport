/** Canonical production site URL (custom domain). */
export const PRODUCTION_APP_URL = "https://tokom.ru";

/** Production host that serves the app without redirect (Vercel apex → www). */
export const PRODUCTION_WEBHOOK_ORIGIN = "https://www.tokom.ru";

/** Staging subdomain — same deployment, password gate + new features. */
export const TEST_APP_URL = "https://test.tokom.ru";

/** Old production host — same Vercel project / same DB as tokom.ru. */
export const LEGACY_VERCEL_HOST = "elektropasport.vercel.app";

const INTERNAL_LISTEN_PORTS = new Set(["3000", "8080"]);

/**
 * Amvera sets HOSTNAME=0.0.0.0 for bind-all and may forward that as
 * X-Forwarded-Host / request.url. Those must never become public redirects.
 */
function isUnusablePublicHost(host: string): boolean {
  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!hostname) return true;
  if (
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::" ||
    hostname === "::1" ||
    hostname === "[::]" ||
    hostname === "[::1]"
  ) {
    return true;
  }
  // Bare IPv4 (container / probe addresses) — not a browser-facing host.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return true;
  return false;
}

function stripInternalListenPort(host: string): string {
  const [name, port] = host.split(":");
  if (!name) return host;
  if (port && INTERNAL_LISTEN_PORTS.has(port)) return name;
  return host;
}

function normalizeHostCandidate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let host = raw.split(",")[0]?.trim() ?? "";
  if (!host) return null;
  host = host.replace(/^https?:\/\//i, "");
  host = host.split("/")[0]?.trim() ?? "";
  if (!host) return null;
  host = stripInternalListenPort(host);
  if (isUnusablePublicHost(host)) return null;
  return host;
}

function envOriginFallback(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (!fromEnv) return null;
  try {
    const url = new URL(fromEnv.replace(/\/$/, ""));
    if (isUnusablePublicHost(url.host)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

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
  const proto = (
    request.headers.get("x-forwarded-proto") ??
    url.protocol.replace(":", "")
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  const scheme = proto === "http" || proto === "https" ? proto : "https";

  // Prefer Host (what the edge received) over X-Forwarded-Host — Amvera often
  // sets the latter to the container listen address 0.0.0.0:3000.
  const candidates = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    url.host,
  ];

  for (const raw of candidates) {
    const host = normalizeHostCandidate(raw);
    if (host) return `${scheme}://${host}`;
  }

  const fromEnv = envOriginFallback();
  if (fromEnv) return fromEnv;

  return PRODUCTION_APP_URL;
}

/** Absolute URL on the public origin (never 0.0.0.0 from request.url). */
export function publicRequestUrl(pathname: string, request: Request): URL {
  const origin = resolveRequestOrigin(request);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, `${origin}/`);
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
    try {
      const url = new URL(fromEnv.replace(/\/$/, ""));
      if (!isUnusablePublicHost(url.host)) {
        return url.origin;
      }
    } catch {
      // fall through
    }
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
