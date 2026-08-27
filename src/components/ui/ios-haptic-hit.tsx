"use client";

import type { MouseEvent } from "react";

/**
 * Invisible iOS 18+ checkbox switch over a control. Tapping it produces
 * a real Taptic Engine click even in a Home Screen web app, where
 * navigator.vibrate is a no-op.
 */
export function IosHapticHit({
  onActivate,
}: {
  onActivate: (event: MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      tabIndex={-1}
      aria-hidden
      {...{ switch: "" }}
      className="absolute inset-0 z-[1] m-0 h-full w-full cursor-pointer opacity-0"
      style={{
        WebkitTapHighlightColor: "transparent",
        clipPath: "inset(0 round 999px)",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onActivate(event);
      }}
    />
  );
}
