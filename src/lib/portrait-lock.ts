"use client";

type OrientationApi = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

function getOrientation(): OrientationApi | null {
  if (typeof window === "undefined" || !screen.orientation) return null;
  return screen.orientation as OrientationApi;
}

/**
 * Keep the app in portrait whenever the browser allows it.
 * No full-screen “rotate back” overlay — only Screen Orientation API + PWA manifest.
 */
export function lockPortraitOrientation(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const orientation = getOrientation();

  const tryLock = () => {
    if (typeof orientation?.lock !== "function") return;
    void orientation.lock("portrait").catch(() => {
      void orientation.lock?.("portrait-primary").catch(() => undefined);
    });
  };

  tryLock();

  // Many browsers only allow lock after a user gesture.
  window.addEventListener("pointerdown", tryLock);
  window.addEventListener("touchstart", tryLock, { passive: true });
  window.addEventListener("click", tryLock);
  document.addEventListener("visibilitychange", tryLock);
  window.addEventListener("focus", tryLock);
  window.addEventListener("pageshow", tryLock);

  const onChange = () => {
    const type = orientation?.type ?? "";
    if (type.startsWith("landscape")) {
      tryLock();
    }
  };

  orientation?.addEventListener?.("change", onChange);
  window.addEventListener("orientationchange", tryLock);

  return () => {
    orientation?.removeEventListener?.("change", onChange);
    window.removeEventListener("orientationchange", tryLock);
    window.removeEventListener("pointerdown", tryLock);
    window.removeEventListener("touchstart", tryLock);
    window.removeEventListener("click", tryLock);
    document.removeEventListener("visibilitychange", tryLock);
    window.removeEventListener("focus", tryLock);
    window.removeEventListener("pageshow", tryLock);
  };
}
