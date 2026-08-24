/** Set in OAuth callback HTML; consumed on first app load to skip boot splash. */
export const POST_AUTH_SKIP_SPLASH_KEY = "ep_skip_splash";

/** Relative path to open after Telegram OAuth (e.g. /docs). */
export const POST_AUTH_NEXT_KEY = "ep_auth_next";

export function safeAuthNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || value.includes("://")) return "/";
  return value;
}
