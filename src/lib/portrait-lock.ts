"use client";

/** Best-effort portrait lock for phones (PWA / supported browsers). */
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
    try {
      orientation?.unlock?.();
    } catch {
      // ignore
    }
  };
}
