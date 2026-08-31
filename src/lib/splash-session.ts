const SPLASH_SEEN_KEY = "ep:splash-seen";

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
