/** Canonical production site URL (custom domain). */
export const PRODUCTION_APP_URL = "https://tokom.ru";

/** Old production host that still has users' localStorage. */
export const LEGACY_VERCEL_HOST = "elektropasport.vercel.app";

export function productionAppHost(): string {
  return "tokom.ru";
}

/**
 * Prefer an explicit env override, then the current request / Vercel URL,
 * then the public tokom.ru domain.
 */
export function resolveAppOrigin(request?: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (request) {
    const url = new URL(request.url);
    const proto =
      request.headers.get("x-forwarded-proto") ??
      url.protocol.replace(":", "");
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      url.host;
    if (host && !host.includes("localhost") && !host.startsWith("127.")) {
      return `${proto}://${host}`;
    }
  }

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  return PRODUCTION_APP_URL;
}

/**
 * Browser-only: after local→server sync on the legacy Vercel host, send the
 * user to tokom.ru so they do not keep a split localStorage.
 */
export function redirectLegacyHostToCanonical(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host !== LEGACY_VERCEL_HOST) return false;
  const next = new URL(PRODUCTION_APP_URL);
  next.pathname = window.location.pathname;
  next.search = window.location.search;
  next.hash = window.location.hash;
  window.location.replace(next.toString());
  return true;
}
