"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { hapticContextMenu } from "@/lib/haptics";
import {
  DEVICE_BODY_COLOR,
  DEVICE_BORDER_COLOR,
  getManufacturerPalette,
} from "@/lib/manufacturer-brands";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

/** DIN module ≈ 18 mm; laconic face height */
export const MODULE_PX = 36;
export const BODY_HEIGHT_PX = 132;
export const TERMINAL_HEIGHT_PX = 18;
/** Gap between neighboring devices on the rail */
export const DEVICE_GAP_PX = 6;

const LONG_PRESS_MS = 480;
const LIFT_DELAY_MS = 90;
const MOVE_CANCEL_PX = 8;

export function isDevicePowered(device: Device): boolean {
  return device.powered !== false;
}

function leverCount(device: Device, modules: number): number {
  const poles = device.poles ?? "";
  if (poles.includes("4") || poles === "3P+N") return Math.min(4, modules);
  if (poles.includes("3")) return Math.min(3, modules);
  if (poles.includes("2") || poles.includes("+N")) return Math.min(2, modules);
  if (poles.includes("1")) return 1;
  return modules;
}

/** Split ratings so each line fits a single DIN module (e.g. 63A / 30mA). */
export function splitRatingLines(rating: string): string[] {
  const trimmed = rating.trim();
  if (!trimmed) return [];

  const bySlash = trimmed
    .split(/\s*[/|·•]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bySlash.length > 1) return bySlash;

  const byUnits = trimmed.match(
    /[A-Za-zА-Яа-я]*\d+(?:[.,]\d+)?\s*(?:mA|kA|A|V|Вт)?/gi,
  );
  if (byUnits && byUnits.length > 1) {
    return byUnits.map((s) => s.replace(/\s+/g, ""));
  }

  return [trimmed];
}

function devicePalette(device: Device) {
  return getManufacturerPalette(device.brandKey, device.manufacturer);
}

function TerminalRow({
  modules,
  side,
  powered,
}: {
  modules: number;
  side: "top" | "bottom";
  powered: boolean;
}) {
  return (
    <div
      className={cn(
        "relative z-[1] flex w-full shrink-0 items-center justify-around",
        powered ? "bg-zinc-200" : "bg-zinc-100",
        side === "top"
          ? "rounded-t-[6px] border-b border-zinc-300"
          : "rounded-b-[6px] border-t border-zinc-300",
      )}
      style={{ height: TERMINAL_HEIGHT_PX }}
      aria-hidden
    >
      {Array.from({ length: modules }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[10px] w-[10px] rounded-[2px] border",
            powered
              ? "border-zinc-400 bg-zinc-300"
              : "border-zinc-300 bg-zinc-200",
          )}
        />
      ))}
    </div>
  );
}

function ModuleDividers({ modules }: { modules: number }) {
  if (modules <= 1) return null;
  return (
    <>
      {Array.from({ length: modules - 1 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-0 w-px bg-zinc-300"
          style={{ left: `${((i + 1) / modules) * 100}%` }}
        />
      ))}
    </>
  );
}

/** Flat 2D paddle: up = ON, down = OFF. */
function FlatLever({
  powered,
  accent,
  wide,
}: {
  powered: boolean;
  accent: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center",
        wide ? "h-[44px]" : "h-[48px]",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-x-[3px] rounded-[5px] border",
          powered ? "border-zinc-300 bg-zinc-100" : "border-zinc-200 bg-zinc-50",
        )}
        style={{ top: 2, bottom: 2 }}
      />
      <div
        className={cn(
          "relative z-[1] flex w-[calc(100%-8px)] flex-col items-center justify-center rounded-[4px] border transition-all duration-200",
          wide ? "h-[28px]" : "h-[32px]",
          powered ? "mt-1 border-transparent" : "mt-auto mb-1 border-zinc-300",
        )}
        style={{
          backgroundColor: powered ? accent : "#d4d4d8",
        }}
      >
        <span
          className={cn(
            "text-[9px] font-extrabold tracking-wide",
            powered ? "text-white" : "text-zinc-500",
          )}
        >
          {powered ? "I" : "O"}
        </span>
      </div>
    </div>
  );
}

function BreakerLevers({
  count,
  modules,
  powered,
  accent,
}: {
  count: number;
  modules: number;
  powered: boolean;
  accent: string;
}) {
  const cols = Math.max(count, 1);
  return (
    <div
      className="grid w-full flex-1 items-center gap-0 px-[1px]"
      style={{ gridTemplateColumns: `repeat(${modules}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: modules }, (_, i) => (
        <div key={i} className="flex min-w-0 items-center justify-center px-[1px]">
          {i < cols ? (
            <FlatLever powered={powered} accent={accent} />
          ) : (
            <span className="h-[48px]" />
          )}
        </div>
      ))}
    </div>
  );
}

function TestButton({ powered }: { powered: boolean }) {
  return (
    <div className="flex w-full justify-center px-[2px]" aria-hidden>
      <span
        className={cn(
          "flex h-[16px] w-full items-center justify-center rounded-[3px] text-[8px] font-extrabold tracking-wide",
          powered
            ? "bg-amber-400 text-amber-950"
            : "bg-zinc-200 text-zinc-400",
        )}
      >
        TEST
      </span>
    </div>
  );
}

function VoltageScreen({ powered, value }: { powered: boolean; value: string }) {
  return (
    <div className="flex w-full flex-col items-stretch px-[2px]" aria-hidden>
      <div
        className={cn(
          "flex min-h-[34px] flex-col items-center justify-center rounded-[4px] px-1 py-1.5",
          powered ? "bg-zinc-900" : "bg-zinc-200",
        )}
      >
        <span
          className={cn(
            "font-mono text-[12px] font-bold leading-none tabular-nums",
            powered ? "text-emerald-400" : "text-zinc-400",
          )}
        >
          {powered ? value : "— — —"}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[6px] font-semibold uppercase tracking-wider",
            powered ? "text-emerald-600" : "text-zinc-400",
          )}
        >
          VAC
        </span>
      </div>
      <span
        className={cn(
          "mx-auto mt-2 h-2 w-2 rounded-full",
          powered ? "bg-emerald-500" : "bg-zinc-300",
        )}
      />
    </div>
  );
}

function SpdWindows({ modules, powered }: { modules: number; powered: boolean }) {
  return (
    <div
      className="grid w-full flex-1 items-center gap-0 px-[2px]"
      style={{ gridTemplateColumns: `repeat(${modules}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: modules }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 px-[2px]">
          <span
            className={cn(
              "h-7 w-full rounded-[3px]",
              powered ? "bg-emerald-500" : "bg-zinc-300",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function parseVoltageHint(rating: string): string {
  const match = rating.match(/(\d{2,3})\s*V/i);
  if (match) return match[1];
  return "230";
}

function DeviceFunction({
  type,
  device,
  modules,
  powered,
  accent,
  showDetails,
}: {
  type: DeviceType;
  device: Device;
  modules: number;
  powered: boolean;
  accent: string;
  showDetails: boolean;
}) {
  const levers = leverCount(device, modules);
  const resolvedType = showDetails ? type : "breaker";

  if (resolvedType === "voltage_relay") {
    return (
      <VoltageScreen
        powered={powered}
        value={showDetails ? parseVoltageHint(device.rating) : "—"}
      />
    );
  }
  if (resolvedType === "spd") {
    return <SpdWindows modules={modules} powered={powered} />;
  }
  if (resolvedType === "rcd" || resolvedType === "diff_breaker") {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <FlatLever powered={powered} accent={accent} wide />
        <TestButton powered={powered} />
      </div>
    );
  }
  return (
    <BreakerLevers
      count={showDetails ? levers : Math.min(1, modules)}
      modules={modules}
      powered={powered}
      accent={accent}
    />
  );
}

function RatingBlock({
  rating,
  poles,
  powered,
}: {
  rating: string;
  poles?: string;
  powered: boolean;
}) {
  const lines = splitRatingLines(rating);
  return (
    <div
      className="mt-auto space-y-0.5 overflow-hidden"
      style={{ maxWidth: MODULE_PX - 4, width: MODULE_PX - 4 }}
    >
      {lines.map((line) => (
        <div
          key={line}
          className={cn(
            "break-all text-left text-[9px] font-semibold leading-[1.15] tabular-nums",
            powered ? "text-zinc-800" : "text-zinc-400",
          )}
        >
          {line}
        </div>
      ))}
      {poles && (
        <div
          className={cn(
            "text-left text-[8px] leading-tight",
            powered ? "text-zinc-500" : "text-zinc-300",
          )}
        >
          {poles}
        </div>
      )}
    </div>
  );
}

const statusBarClass: Record<Device["status"], string> = {
  verified: "bg-emerald-500",
  pending: "bg-amber-500",
  unknown: "bg-zinc-300",
};

export function deviceFaceHeight(showTerminals: boolean): number {
  return BODY_HEIGHT_PX + (showTerminals ? TERMINAL_HEIGHT_PX * 2 : 0);
}

export function DeviceFaceStatic({
  device,
  modules,
  showTerminals = false,
  brand,
  showDetails = true,
  className,
}: {
  device: Device;
  modules: number;
  showTerminals?: boolean;
  brand?: ReactNode;
  /** When false, hide logo/type-specific chrome/ratings (low confidence). */
  showDetails?: boolean;
  className?: string;
}) {
  const width = modules * MODULE_PX;
  const powered = isDevicePowered(device);
  const palette = devicePalette(device);
  const accent = showDetails ? palette.accent : "#A1A1AA";
  const body = powered ? DEVICE_BODY_COLOR : "#F4F4F5";
  const border = DEVICE_BORDER_COLOR;

  return (
    <div
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        boxSizing: "border-box",
        backgroundColor: body,
        borderColor: border,
        color: powered ? palette.text : undefined,
      }}
      className={cn(
        "relative flex w-full min-w-0 flex-col overflow-hidden rounded-[8px] border text-left transition-colors duration-200",
        !powered && "text-zinc-400 grayscale",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-[2] h-[3px]"
        style={{ backgroundColor: powered ? accent : "#d4d4d8" }}
      />
      <ModuleDividers modules={modules} />
      {showTerminals && (
        <TerminalRow modules={modules} side="top" powered={powered} />
      )}
      <div
        className="relative z-[1] flex w-full flex-col px-[3px] pt-2 pb-1.5"
        style={{ height: BODY_HEIGHT_PX }}
      >
        {showDetails && brand && (
          <div
            className={cn("mb-1 overflow-hidden", !powered && "opacity-40")}
            style={{ maxWidth: MODULE_PX - 4 }}
          >
            {brand}
          </div>
        )}
        <DeviceFunction
          type={device.type}
          device={device}
          modules={modules}
          powered={powered}
          accent={accent}
          showDetails={showDetails}
        />
        {showDetails ? (
          <RatingBlock
            rating={device.rating}
            poles={device.poles}
            powered={powered}
          />
        ) : (
          <div className="mt-auto" aria-hidden />
        )}
      </div>
      {showTerminals && (
        <TerminalRow modules={modules} side="bottom" powered={powered} />
      )}
    </div>
  );
}

export function DeviceMiniPreview({
  device,
  scale = 0.38,
  showTerminals = false,
  brand,
  showDetails = true,
}: {
  device: Device;
  scale?: number;
  showTerminals?: boolean;
  brand?: ReactNode;
  showDetails?: boolean;
}) {
  const modules = device.modules && device.modules > 0 ? device.modules : 1;
  const width = modules * MODULE_PX;
  const height = deviceFaceHeight(showTerminals);

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width: width * scale, height: height * scale }}
      aria-hidden
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width, transform: `scale(${scale})` }}
      >
        <DeviceFaceStatic
          device={device}
          modules={modules}
          showTerminals={showTerminals}
          brand={brand}
          showDetails={showDetails}
        />
      </div>
    </div>
  );
}

export function DeviceFace({
  device,
  modules,
  selected,
  showTerminals,
  onSelect,
  onLongPress,
  brand,
  showDetails = true,
}: {
  device: Device;
  modules: number;
  selected: boolean;
  showTerminals: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  onLongPress?: () => void;
  brand?: ReactNode;
  showDetails?: boolean;
}) {
  const width = modules * MODULE_PX;
  const timerRef = useRef<number | null>(null);
  const liftTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressedRef = useRef(false);
  const [lifted, setLifted] = useState(false);

  const clearTimers = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (liftTimerRef.current != null) {
      window.clearTimeout(liftTimerRef.current);
      liftTimerRef.current = null;
    }
  };

  const startPress = (clientX: number, clientY: number) => {
    longPressedRef.current = false;
    clearTimers();
    startPointRef.current = { x: clientX, y: clientY };
    liftTimerRef.current = window.setTimeout(() => {
      setLifted(true);
    }, LIFT_DELAY_MS);
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      setLifted(true);
      hapticContextMenu();
      onLongPress?.();
      if (settleTimerRef.current != null) {
        window.clearTimeout(settleTimerRef.current);
      }
      settleTimerRef.current = window.setTimeout(() => {
        setLifted(false);
        settleTimerRef.current = null;
      }, 280);
    }, LONG_PRESS_MS);
  };

  const endPress = () => {
    clearTimers();
    startPointRef.current = null;
    if (!longPressedRef.current) setLifted(false);
  };

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        if (longPressedRef.current) {
          longPressedRef.current = false;
          return;
        }
        onSelect(event);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        startPress(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        const start = startPointRef.current;
        if (!start) return;
        if (
          Math.abs(event.clientX - start.x) > MOVE_CANCEL_PX ||
          Math.abs(event.clientY - start.y) > MOVE_CANCEL_PX
        ) {
          endPress();
        }
      }}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onContextMenu={(event) => event.preventDefault()}
      animate={{
        scale: lifted ? 1.08 : 1,
        y: lifted ? -3 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 28,
        mass: 0.7,
      }}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        boxSizing: "border-box",
        touchAction: "manipulation",
        filter: lifted
          ? "drop-shadow(0 12px 22px rgba(17,17,19,0.22))"
          : "drop-shadow(0 0 0 rgba(0,0,0,0))",
      }}
      className={cn(
        "block origin-center p-0 select-none",
        lifted && "relative z-20",
        selected &&
          "rounded-[8px] ring-2 ring-zinc-900 ring-offset-2 ring-offset-white",
      )}
      aria-pressed={isDevicePowered(device)}
    >
      <DeviceFaceStatic
        device={device}
        modules={modules}
        showTerminals={showTerminals}
        brand={brand}
        showDetails={showDetails}
      />
    </motion.button>
  );
}

export function DeviceStatusBar({ status }: { status: Device["status"] }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-1 block h-[3px] w-full rounded-full",
        statusBarClass[status],
      )}
    />
  );
}
