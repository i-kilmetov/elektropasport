"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  cableMarkerStyleForDigit,
  type CableMarkerStyle,
} from "@/lib/cable-marker-colors";
import { cn } from "@/lib/utils";

const CLIP_W = 36;
const CLIP_W_WIDE = 50;
const CLIP_H = 58;

function clipWidth(label: string): number {
  return label.length > 1 ? CLIP_W_WIDE : CLIP_W;
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
  const fontSize = label.length > 1 ? 14 : 19;
  const ghostStroke =
    ghostTone === "light" ? "rgba(255,255,255,0.62)" : "rgba(17,17,19,0.35)";
  const ghostFillTop =
    ghostTone === "light" ? "rgba(255,255,255,0.42)" : "rgba(17,17,19,0.08)";
  const ghostFillMid =
    ghostTone === "light" ? "rgba(255,255,255,0.16)" : "rgba(17,17,19,0.05)";
  const ghostFillBot =
    ghostTone === "light" ? "rgba(255,255,255,0.08)" : "rgba(17,17,19,0.03)";
  const ghostSide =
    ghostTone === "light" ? "rgba(255,255,255,0.22)" : "rgba(17,17,19,0.12)";

  return (
    <svg
      viewBox={`0 0 ${w} ${CLIP_H}`}
      width={w}
      height={CLIP_H}
      className={cn(
        "shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.32)]",
        blinking && "animate-cable-clip-blink",
        className,
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ghost ? ghostFillTop : colors.faceLight} />
          <stop offset="55%" stopColor={ghost ? ghostFillMid : colors.face} />
          <stop offset="100%" stopColor={ghost ? ghostFillBot : colors.side} />
        </linearGradient>
        <linearGradient id={`${uid}-side-l`} x1="1" y1="0" x2="0" y2="0">
          <stop
            offset="0%"
            stopColor={ghost ? (ghostTone === "light" ? "rgba(255,255,255,0.06)" : "rgba(17,17,19,0.04)") : colors.side}
          />
          <stop offset="100%" stopColor={ghost ? ghostSide : colors.face} />
        </linearGradient>
        <linearGradient id={`${uid}-side-r`} x1="0" y1="0" x2="1" y2="0">
          <stop
            offset="0%"
            stopColor={ghost ? (ghostTone === "light" ? "rgba(255,255,255,0.06)" : "rgba(17,17,19,0.04)") : colors.side}
          />
          <stop offset="100%" stopColor={ghost ? ghostSide : colors.face} />
        </linearGradient>
      </defs>

      <path
        d={`M5 32 Q2 40 3.5 48 Q6 ${CLIP_H - 2} 10 ${CLIP_H - 1} L10 32 Z`}
        fill={`url(#${uid}-side-l)`}
        stroke={ghost ? ghostStroke : "rgba(0,0,0,0.15)"}
        strokeWidth="0.7"
      />
      <path
        d={`M${w - 5} 32 Q${w - 2} 40 ${w - 3.5} 48 Q${w - 6} ${CLIP_H - 2} ${w - 10} ${CLIP_H - 1} L${w - 10} 32 Z`}
        fill={`url(#${uid}-side-r)`}
        stroke={ghost ? ghostStroke : "rgba(0,0,0,0.15)"}
        strokeWidth="0.7"
      />

      <rect
        x="3.5"
        y="2"
        width={w - 7}
        height="30"
        rx="4"
        fill={`url(#${uid}-top)`}
        stroke={ghost ? ghostStroke : "rgba(0,0,0,0.16)"}
        strokeWidth="0.9"
      />
      {!ghost ? (
        <rect
          x="6"
          y="4.5"
          width={w - 12}
          height="4"
          rx="2"
          fill="rgba(255,255,255,0.22)"
        />
      ) : null}

      <rect
        x={w - 5.5}
        y="15"
        width="3.5"
        height="11"
        rx="1.2"
        fill={ghost ? (ghostTone === "light" ? "rgba(255,255,255,0.18)" : "rgba(17,17,19,0.06)") : colors.face}
        stroke={ghost ? ghostStroke : "rgba(0,0,0,0.12)"}
        strokeWidth="0.5"
      />

      {!ghost ? (
        <text
          x={w / 2}
          y="21"
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

function CableWire({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-[7px] h-[15px] rounded-full",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-[#0c0c0e]" />
      <div className="absolute inset-x-[1%] top-[2px] h-[5px] rounded-full bg-white/[0.12]" />
      <div className="absolute inset-x-0 bottom-0 h-[4px] rounded-full bg-black/50" />
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
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const prefixStyle = cableMarkerStyleForDigit("7");

  const digits = value
    .replace(/\D/g, "")
    .replace(/^7/, "")
    .replace(/^8/, "")
    .slice(0, 10);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollLeft = row.scrollWidth;
  }, [digits.length]);

  const focusInput = () => {
    if (disabled) return;
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className="relative min-h-[92px] cursor-text touch-manipulation"
        onPointerDown={(event) => {
          event.preventDefault();
          focusInput();
        }}
      >
        <CableWire />

        <div
          ref={rowRef}
          className="relative z-[1] flex items-end gap-0 overflow-x-auto px-4 pb-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <CableMarkerClip label="+7" style={prefixStyle} />
          {digits.split("").map((digit, index) => (
            <CableMarkerClip
              key={`${index}-${digit}`}
              label={digit}
              style={cableMarkerStyleForDigit(digit)}
              className="-ml-[4px]"
            />
          ))}
          {focused && digits.length < 10 ? (
            <CableMarkerClip
              ghost
              blinking
              ghostTone={ghostTone}
              className="-ml-[4px]"
              label=""
            />
          ) : null}
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
        <button
          type="button"
          disabled={disabled || submitting}
          onClick={onSubmit}
          className="absolute right-3 bottom-[22px] z-[3] flex h-11 w-11 items-center justify-center rounded-full bg-[#111113] text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-opacity disabled:opacity-50"
          aria-label="Продолжить"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="h-5 w-5" />
          )}
        </button>
      ) : null}
    </div>
  );
}
