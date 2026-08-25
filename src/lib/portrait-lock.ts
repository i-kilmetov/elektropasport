"use client";

/**
 * Best-effort portrait lock for phones (PWA / supported browsers).
 * CSS landscape blocker is applied in globals.css as a fallback.
 */
export function lockPortraitOrientation(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
  };

  const tryLock = () => {
    if (typeof orientation?.lock !== "function") return;
    void orientation.lock("portrait").catch(() => {
      void orientation.lock?.("portrait-primary").catch(() => undefined);
    });
  };

  tryLock();
  // Re-try after a user gesture — some browsers only allow lock then.
  const onGesture = () => tryLock();
  window.addEventListener("pointerdown", onGesture, { once: true });
  window.addEventListener("touchstart", onGesture, { once: true });

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
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("touchstart", onGesture);
    try {
      orientation?.unlock?.();
    } catch {
      // ignore
    }
  };
}
