import { isTestAppHost } from "@/lib/app-env";
import { canUseServerAuth } from "@/lib/client-auth";

const SPLASH_SEEN_KEY = "ep:splash-seen";
const SKIP_SPLASH_QUERY = "skipSplash";

export type SplashPhase = "pending" | "show" | "done";

/** Skip splash when AppShell remounts in the same browser tab (e.g. after test login). */
export function hasSeenSplashThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
  } catch {
    // private mode
  }
}

export function hasSkipSplashQuery(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get(SKIP_SPLASH_QUERY) === "1"
  );
}

export function stripSkipSplashQuery(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SKIP_SPLASH_QUERY)) return;
  url.searchParams.delete(SKIP_SPLASH_QUERY);
  const next =
    url.pathname +
    (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
    url.hash;
  window.history.replaceState({}, "", next);
}

/** Boot splash is redundant after test-site password or before Telegram auth on staging. */
export function shouldSkipBootSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (hasSeenSplashThisSession()) return true;
  if (hasSkipSplashQuery()) return true;
  if (isTestAppHost(window.location.hostname) && !canUseServerAuth()) {
    return true;
  }
  return false;
}

export function resolveInitialSplashPhase(options: {
  launchWaitlist?: boolean;
  forceResearchSurvey?: boolean;
  /** From server Host on staging — avoids SSR "pending" before client sessionStorage. */
  skipBootSplash?: boolean;
} = {}): SplashPhase {
  if (options.forceResearchSurvey || options.launchWaitlist) return "done";
  if (options.skipBootSplash) return "done";
  if (typeof window === "undefined") return "pending";
  if (shouldSkipBootSplash()) return "done";
  return "pending";
}

export function buildPostTestLoginUrl(
  next: string,
  origin = typeof window !== "undefined" ? window.location.origin : "https://test.tokom.ru",
): string {
  const url = new URL(next, origin);
  url.searchParams.set(SKIP_SPLASH_QUERY, "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
