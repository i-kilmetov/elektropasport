"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  BRAND_YELLOW,
  LOGO_INK,
  STRIPE_ABOVE_CROSSBAR,
  STRIPE_BOTTOM_WIDTH,
  STRIPE_HEIGHT,
  STRIPE_PAD_TOP,
  STRIPE_STRIPE_GAP,
  STRIPE_TOP_WIDTH,
  T_CAP_BEARING,
  WORDMARK_REST,
  wordmarkTypeStyle,
} from "@/lib/brand-wordmark";
import { cn } from "@/lib/utils";

export { BRAND_YELLOW };

function TStripes({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
      style={{
        gap: STRIPE_STRIPE_GAP,
        bottom: `calc(100% - ${T_CAP_BEARING})`,
        paddingBottom: STRIPE_ABOVE_CROSSBAR,
      }}
    >
      <span
        className="block min-h-[2px] max-w-[14px]"
        style={{
          width: STRIPE_TOP_WIDTH,
          height: STRIPE_HEIGHT,
          backgroundColor: color,
        }}
      />
      <span
        className="block min-h-[2px] max-w-[46px]"
        style={{
          width: STRIPE_BOTTOM_WIDTH,
          height: STRIPE_HEIGHT,
          backgroundColor: color,
        }}
      />
    </span>
  );
}

export function TokomWordmark({
  fontSize,
  color = LOGO_INK,
  className,
}: {
  fontSize: number | string;
  color?: string;
  className?: string;
}) {
  const typeStyle = wordmarkTypeStyle(fontSize, color);

  return (
    <span
      className={cn("inline-flex items-end whitespace-nowrap", className)}
      style={typeStyle}
    >
      <span
        className="relative inline-block shrink-0 leading-none"
        style={{ paddingTop: STRIPE_PAD_TOP }}
      >
        <span className="relative inline-block leading-none">
          <TStripes color={color} />
          Т
        </span>
      </span>
      <span className="inline-block leading-none">{WORDMARK_REST}</span>
    </span>
  );
}

export function BrandLogo({
  className,
  onDark = false,
}: {
  className?: string;
  /** Black background → brand yellow. Light background → black. */
  onDark?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number>(28);
  const color = onDark ? BRAND_YELLOW : LOGO_INK;

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const height = node.getBoundingClientRect().height;
      if (height > 0) setFontSize(height * 0.92);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      role="img"
      aria-label="Током"
      className={cn("inline-block leading-none", className)}
    >
      <TokomWordmark fontSize={fontSize} color={color} />
    </span>
  );
}
