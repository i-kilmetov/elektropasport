"use client";

type OrientationApi = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

let pauseCount = 0;
let activeTryLock: (() => void) | null = null;

function getOrientation(): OrientationApi | null {
  if (typeof window === "undefined" || !screen.orientation) return null;
  return screen.orientation as OrientationApi;
}

/**
 * Best-effort portrait lock for phones (PWA / supported browsers).
 * Soft only — no full-screen “rotate back” overlay (that blocked barcode scanning).
 */
export function lockPortraitOrientation(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const orientation = getOrientation();

  const tryLock = () => {
    if (pauseCount > 0) return;
    if (typeof orientation?.lock !== "function") return;
    void orientation.lock("portrait").catch(() => {
      void orientation.lock?.("portrait-primary").catch(() => undefined);
    });
  };

  activeTryLock = tryLock;
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
    if (activeTryLock === tryLock) activeTryLock = null;
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

/** Temporarily allow any orientation (e.g. barcode scan). Nested-safe. */
export function pausePortraitOrientationLock(): () => void {
  pauseCount += 1;
  const orientation = getOrientation();
  try {
    orientation?.unlock?.();
  } catch {
    // ignore
  }

  return () => {
    pauseCount = Math.max(0, pauseCount - 1);
    if (pauseCount === 0) {
      activeTryLock?.();
    }
  };
}
