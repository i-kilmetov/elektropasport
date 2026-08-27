"use client";

/**
 * Haptic helpers for Telegram Mini App, Android, and iOS Safari / Home Screen PWAs.
 *
 * iOS does not implement Vibration API — `navigator.vibrate` exists but is a no-op.
 * Safari 18+ fires Taptic Engine when an `<input type="checkbox" switch>` toggles
 * during a user gesture. We click a hidden switch for that path.
 */

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "error" | "success" | "warning";

function webAppHaptic() {
  if (typeof window === "undefined") return null;
  const haptic = (
    window.Telegram?.WebApp as
      | {
          HapticFeedback?: {
            impactOccurred?: (style: ImpactStyle) => void;
            notificationOccurred?: (type: NotificationType) => void;
            selectionChanged?: () => void;
          };
        }
      | undefined
  )?.HapticFeedback;
  return haptic ?? null;
}

function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Chrome/Android vibrate works. iOS exposes the method but always returns false. */
function nativeVibrateWorks(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;
  if (isAppleTouchDevice()) return false;
  try {
    return navigator.vibrate(0) === true;
  } catch {
    return false;
  }
}

let iosSwitchLabel: HTMLLabelElement | null = null;

function iosSwitchHaptic(): boolean {
  if (typeof document === "undefined") return false;
  if (!isAppleTouchDevice()) return false;
  try {
    if (!iosSwitchLabel || !iosSwitchLabel.isConnected) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      Object.assign(label.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "32px",
        height: "32px",
        margin: "0",
        overflow: "hidden",
        opacity: "0.01",
        pointerEvents: "none",
        zIndex: "-1",
      });
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      iosSwitchLabel = label;
    }
    iosSwitchLabel.click();
    return true;
  } catch {
    return false;
  }
}

function vibrateFallback(pattern: number | number[]): void {
  if (!nativeVibrateWorks()) {
    iosSwitchHaptic();
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

export function hapticImpact(style: ImpactStyle = "medium"): void {
  try {
    const haptic = webAppHaptic();
    if (haptic?.impactOccurred) {
      haptic.impactOccurred(style);
      return;
    }
    if (iosSwitchHaptic()) return;
    const ms =
      style === "heavy" || style === "rigid"
        ? 40
        : style === "medium"
          ? 25
          : 12;
    vibrateFallback(ms);
  } catch {
    // ignore
  }
}

export function hapticNotification(
  type: NotificationType = "success",
): void {
  try {
    const haptic = webAppHaptic();
    if (haptic?.notificationOccurred) {
      haptic.notificationOccurred(type);
      return;
    }
    if (isAppleTouchDevice()) {
      iosSwitchHaptic();
      if (type !== "success") {
        window.setTimeout(() => iosSwitchHaptic(), 70);
      }
      return;
    }
    if (type === "success") vibrateFallback([18, 40, 28]);
    else if (type === "error") vibrateFallback([40, 30, 40]);
    else vibrateFallback(30);
  } catch {
    // ignore
  }
}

/** Light tap for buttons that open another screen. */
export function hapticNav(): void {
  hapticImpact("light");
}

/** Subtle tick when a drop target / insertion slot changes. */
export function hapticSelection(): void {
  try {
    const haptic = webAppHaptic();
    if (haptic?.selectionChanged) {
      haptic.selectionChanged();
      return;
    }
    if (iosSwitchHaptic()) return;
    vibrateFallback(8);
  } catch {
    // ignore
  }
}

/** Feedback when the user deletes a panel or request. */
export function hapticDelete(): void {
  hapticNotification("error");
}

/**
 * iOS-like context-menu / home-screen long-press confirmation.
 * Prefer selectionChanged + medium impact when both exist.
 */
export function hapticContextMenu(): void {
  try {
    const haptic = webAppHaptic();
    if (haptic?.selectionChanged) {
      haptic.selectionChanged();
    }
    if (haptic?.impactOccurred) {
      haptic.impactOccurred("medium");
      return;
    }
    if (iosSwitchHaptic()) return;
    vibrateFallback([8, 30, 18]);
  } catch {
    // ignore
  }
}
