"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  cableMarkerStyleForDigit,
  type CableMarkerStyle,
} from "@/lib/cable-marker-colors";
import { cn } from "@/lib/utils";

const CLIP_W = 32;
const CLIP_W_WIDE = 46;
const CLIP_H = 30;
const CLIP_OVERLAP = 3;
const DIGIT_SLOTS = 10;
const ROW_H = 38;

export type CablePhoneLiftState = {
  open: boolean;
  bottom: number;
  height: number;
};

function clipWidth(label: string): number {
  return label.length > 1 ? CLIP_W_WIDE : CLIP_W;
}

function totalClipsWidth(count: number, firstWide = true): number {
  if (count <= 0) return 0;
  const first = firstWide ? CLIP_W_WIDE : CLIP_W;
  if (count === 1) return first;
  return first + (count - 1) * (CLIP_W - CLIP_OVERLAP);
}

function useKeyboardLift(active: boolean) {
  const [lift, setLift] = useState({ open: false, bottom: 0 });

  useEffect(() => {
    if (!active) {
      setLift({ open: false, bottom: 0 });
      return;
    }

    const sync = () => {
      const vv = window.visualViewport;
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const keyboardOpen =
        window.innerHeight - height > 80 || offsetTop > 0;

      if (keyboardOpen) {
        const gap = 12;
        setLift({
          open: true,
          bottom: Math.max(
            gap,
            window.innerHeight - height - offsetTop + gap,
          ),
        });
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } else {
        setLift({ open: false, bottom: 0 });
      }
    };

    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [active]);

  return lift;
}

function CableMarkerClip({
  label,
  style,
  ghost = false,
  blinking = false,
  ghostTone = "light",
  className,
}: {
  label: string;
  style?: CableMarkerStyle;
  ghost?: boolean;
  blinking?: boolean;
  ghostTone?: "light" | "dark";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const w = clipWidth(label);
  const colors = style ?? cableMarkerStyleForDigit("7");
  const fontSize = label.length > 1 ? 13 : 17;
  const faceW = w - 7;
  const ghostStroke =
    ghostTone === "light" ? "rgba(255,255,255,0.62)" : "rgba(17,17,19,0.35)";
  const ghostFillTop =
    ghostTone === "light" ? "rgba(255,255,255,0.42)" : "rgba(17,17,19,0.08)";
  const ghostFillMid =
    ghostTone === "light" ? "rgba(255,255,255,0.16)" : "rgba(17,17,19,0.05)";
  const ghostFillBot =
    ghostTone === "light" ? "rgba(255,255,255,0.08)" : "rgba(17,17,19,0.03)";

  return (
    <svg
      viewBox={`0 0 ${w} ${CLIP_H}`}
      width={w}
      height={CLIP_H}
      className={cn(
        "shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,0.28)]",
        blinking && "animate-cable-clip-blink",
        className,
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ghost ? ghostFillTop : colors.faceLight} />
          <stop offset="55%" stopColor={ghost ? ghostFillMid : colors.face} />
          <stop offset="100%" stopColor={ghost ? ghostFillBot : colors.side} />
        </linearGradient>
      </defs>

      {/* Left depth edge (front view) */}
      <rect
        x="2"
        y="3"
        width="2.5"
        height="24"
        rx="0.8"
        fill={ghost ? "rgba(255,255,255,0.14)" : colors.side}
        opacity={ghost ? 1 : 0.85}
      />

      {/* Colored face */}
      <rect
        x="4.5"
        y="3"
        width={faceW}
        height="24"
        rx="3.5"
        fill={`url(#${uid}-face)`}
        stroke={ghost ? ghostStroke : "rgba(0,0,0,0.16)"}
        strokeWidth="0.9"
      />

      {!ghost ? (
        <rect
          x="7"
          y="5"
          width={faceW - 5}
          height="3.5"
          rx="1.5"
          fill="rgba(255,255,255,0.22)"
        />
      ) : null}

      {/* Side interlock tab */}
      <rect
        x={w - 5}
        y="10"
        width="3.5"
        height="10"
        rx="1.2"
        fill={ghost ? "rgba(255,255,255,0.18)" : colors.face}
        stroke={ghost ? ghostStroke : "rgba(0,0,0,0.12)"}
        strokeWidth="0.5"
      />

      {!ghost ? (
        <text
          x={4.5 + faceW / 2}
          y="16"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize={fontSize}
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}

function CableWire() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-[14px] -translate-y-1/2 rounded-full"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-[#0c0c0e]" />
      <div className="absolute inset-x-[1%] top-[2px] h-[4px] rounded-full bg-white/[0.12]" />
      <div className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-black/50" />
    </div>
  );
}

export function CablePhoneInput({
  value,
  onChange,
  onSubmit,
  disabled,
  submitting,
  phoneValid,
  className,
  inputId = "phone-login",
  ghostTone = "light",
  variant = "card",
  onLiftChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  submitting?: boolean;
  phoneValid?: boolean;
  className?: string;
  inputId?: string;
  ghostTone?: "light" | "dark";
  variant?: "splash" | "card";
  onLiftChange?: (state: CablePhoneLiftState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [scale, setScale] = useState(1);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const keyboardLift = useKeyboardLift(focused);
  const prefixStyle = cableMarkerStyleForDigit("7");

  const digits = value
    .replace(/\D/g, "")
    .replace(/^7/, "")
    .replace(/^8/, "")
    .slice(0, 10);

  const clipCount = 1 + DIGIT_SLOTS;
  const rowWidth = totalClipsWidth(clipCount);
  const rowHeight = ROW_H * scale;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const available = shell.clientWidth;
      const nextScale =
        rowWidth > available ? Math.max(0.72, available / rowWidth) : 1;
      setScale(nextScale);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rowWidth]);

  useEffect(() => {
    if (!focused) return;
    const shell = shellRef.current;
    if (!shell) return;
    const measure = () => setPlaceholderHeight(shell.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [focused, phoneValid, scale]);

  useEffect(() => {
    onLiftChange?.({
      open: keyboardLift.open,
      bottom: keyboardLift.bottom,
      height: placeholderHeight || shellRef.current?.offsetHeight || 0,
    });
  }, [keyboardLift.open, keyboardLift.bottom, placeholderHeight, onLiftChange]);

  useEffect(() => {
    if (!focused && !keyboardLift.open) {
      onLiftChange?.({ open: false, bottom: 0, height: 0 });
    }
  }, [focused, keyboardLift.open, onLiftChange]);

  const focusInput = () => {
    if (disabled) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  const clipStack = (
    <>
      <CableMarkerClip label="+7" style={prefixStyle} />
      {digits.split("").map((digit, index) => (
        <CableMarkerClip
          key={`${index}-${digit}`}
          label={digit}
          style={cableMarkerStyleForDigit(digit)}
          className="-ml-[3px]"
        />
      ))}
      {Array.from({ length: DIGIT_SLOTS - digits.length }, (_, index) => (
        <CableMarkerClip
          key={`ghost-${digits.length + index}`}
          label=""
          ghost
          ghostTone={ghostTone}
          blinking={focused && index === 0}
          className="-ml-[3px]"
        />
      ))}
    </>
  );

  return (
    <>
      {keyboardLift.open ? (
        <div
          aria-hidden
          className="w-full"
          style={{ height: placeholderHeight }}
        />
      ) : null}
      <div
        ref={shellRef}
        className={cn(
          "w-full transition-[transform,opacity] duration-200",
          keyboardLift.open && "fixed inset-x-0 z-[300] pt-2",
          keyboardLift.open && variant === "splash" && "bg-[#D3DA00]",
          keyboardLift.open &&
            variant === "card" &&
            "bg-white/95 backdrop-blur-sm",
          className,
        )}
        style={
          keyboardLift.open
            ? {
                bottom: `${keyboardLift.bottom}px`,
                paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
                paddingRight: "max(0.75rem, env(safe-area-inset-right))",
              }
            : undefined
        }
      >
        <div
          className="relative flex cursor-text touch-manipulation items-center justify-center"
          style={{ minHeight: rowHeight }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            event.preventDefault();
            focusInput();
          }}
        >
          <CableWire />

          <div
            className="relative z-[1] flex justify-center"
            style={{
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: "center center",
            }}
          >
            <div className="flex items-center">{clipStack}</div>
          </div>

          <input
            ref={inputRef}
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={value}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 z-[2] cursor-text opacity-0"
            aria-label="Номер телефона"
          />
        </div>

        {phoneValid ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              disabled={disabled || submitting}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onSubmit}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111113] text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-opacity disabled:opacity-50"
              aria-label="Продолжить"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
