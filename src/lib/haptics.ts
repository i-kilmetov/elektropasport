"use client";

/**
 * Telegram Mini App haptic helpers.
 * Falls back to navigator.vibrate when available outside Telegram.
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
          };
        }
      | undefined
  )?.HapticFeedback;
  return haptic ?? null;
}

export function hapticImpact(style: ImpactStyle = "medium"): void {
  try {
    const haptic = webAppHaptic();
    if (haptic?.impactOccurred) {
      haptic.impactOccurred(style);
      return;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const ms =
        style === "heavy" || style === "rigid"
          ? 40
          : style === "medium"
            ? 25
            : 12;
      navigator.vibrate(ms);
    }
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
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      if (type === "success") navigator.vibrate([18, 40, 28]);
      else if (type === "error") navigator.vibrate([40, 30, 40]);
      else navigator.vibrate(30);
    }
  } catch {
    // ignore
  }
}
