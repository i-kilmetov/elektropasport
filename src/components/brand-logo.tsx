"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  TokomPlusMark,
  type TokomPlusMarkVariant,
} from "@/components/brand/tokom-plus-mark";
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
export { TokomPlusMark };

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

/** Capital «Т» with the two brand stripes — for compact badges. */
export function TokomTMark({
  fontSize = "0.95em",
  color = LOGO_INK,
  className,
}: {
  fontSize?: number | string;
  color?: string;
  className?: string;
}) {
  const typeStyle = wordmarkTypeStyle(fontSize, color);
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block shrink-0 leading-none",
        className,
      )}
      style={{ ...typeStyle, paddingTop: STRIPE_PAD_TOP }}
    >
      <span className="relative inline-block leading-none">
        <TStripes color={color} />
        Т
      </span>
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
      <TokomTMark fontSize={fontSize} color={color} />
      <span className="inline-block leading-none">{WORDMARK_REST}</span>
    </span>
  );
}

export function BrandLogo({
  className,
  onDark = false,
  plus = false,
  plusVariant,
}: {
  className?: string;
  /** Black background → brand yellow. Light background → black. */
  onDark?: boolean;
  /** Show «Током Плюс» mark after the wordmark. */
  plus?: boolean;
  plusVariant?: TokomPlusMarkVariant;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number>(28);
  const color = onDark ? BRAND_YELLOW : LOGO_INK;
  const resolvedPlusVariant: TokomPlusMarkVariant =
    plusVariant ?? (onDark ? "onYellow" : "color");

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
      aria-label={plus ? "Током Плюс" : "Током"}
      className={cn(
        "inline-flex items-center leading-none",
        plus && "gap-[0.28em]",
        className,
      )}
    >
      <TokomWordmark fontSize={fontSize} color={color} />
      {plus ? (
        <TokomPlusMark
          size={fontSize * 0.92}
          variant={resolvedPlusVariant}
        />
      ) : null}
    </span>
  );
}
