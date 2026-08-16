"use client";

import { type MouseEvent, type PointerEvent, type ReactNode } from "react";
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

export function isDevicePowered(_device?: Device): boolean {
  // Scheme always shows devices as ON — power toggle was removed.
  return true;
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
  deviceId,
  interactive,
  highlightKey,
  onTerminalPointerDown,
}: {
  modules: number;
  side: "top" | "bottom";
  deviceId?: number;
  interactive?: boolean;
  highlightKey?: string | null;
  onTerminalPointerDown?: (
    terminal: { deviceId: number; side: "top" | "bottom"; index: number },
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <div
      className={cn(
        "relative z-[3] flex w-full shrink-0 items-center justify-around bg-zinc-200",
        side === "top"
          ? "rounded-t-[6px] border-b border-zinc-300"
          : "rounded-b-[6px] border-t border-zinc-300",
      )}
      style={{ height: TERMINAL_HEIGHT_PX }}
      aria-hidden={!interactive}
    >
      {Array.from({ length: modules }, (_, i) => {
        const key =
          deviceId != null ? `${deviceId}:${side}:${i}` : `term-${side}-${i}`;
        const active = highlightKey === key;
        const screw = (
          <span
            className={cn(
              "h-[10px] w-[10px] rounded-[2px] border border-zinc-400 bg-zinc-300",
              active && "border-zinc-900 bg-zinc-900",
            )}
          />
        );
        if (!interactive || deviceId == null) {
          return (
            <span key={key} className="flex h-full flex-1 items-center justify-center">
              {screw}
            </span>
          );
        }
        return (
          <button
            key={key}
            type="button"
            data-terminal={key}
            aria-label={`Клемма ${side === "top" ? "сверху" : "снизу"} ${i + 1}`}
            className={cn(
              "flex h-full flex-1 items-center justify-center touch-none",
              active && "bg-zinc-900/10",
            )}
            onPointerDown={(event) => {
              event.stopPropagation();
              onTerminalPointerDown?.(
                { deviceId, side, index: i },
                event,
              );
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {screw}
          </button>
        );
      })}
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
  interactiveTerminals = false,
  highlightTerminalKey = null,
  onTerminalPointerDown,
  className,
}: {
  device: Device;
  modules: number;
  showTerminals?: boolean;
  brand?: ReactNode;
  /** When false, hide logo/type-specific chrome/ratings (low confidence). */
  showDetails?: boolean;
  interactiveTerminals?: boolean;
  highlightTerminalKey?: string | null;
  onTerminalPointerDown?: (
    terminal: { deviceId: number; side: "top" | "bottom"; index: number },
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  className?: string;
}) {
  const width = modules * MODULE_PX;
  const powered = true;
  const palette = devicePalette(device);
  const accent = showDetails ? palette.accent : "#A1A1AA";
  const body = DEVICE_BODY_COLOR;
  const border = DEVICE_BORDER_COLOR;

  return (
    <div
      data-device-face={device.id}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        boxSizing: "border-box",
        backgroundColor: body,
        borderColor: border,
        color: palette.text,
      }}
      className={cn(
        "relative flex w-full min-w-0 flex-col overflow-hidden rounded-[8px] border text-left transition-colors duration-200",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-[2] h-[3px]"
        style={{ backgroundColor: accent }}
      />
      <ModuleDividers modules={modules} />
      {showTerminals && (
        <TerminalRow
          modules={modules}
          side="top"
          deviceId={device.id}
          interactive={interactiveTerminals}
          highlightKey={highlightTerminalKey}
          onTerminalPointerDown={onTerminalPointerDown}
        />
      )}
      <div
        className="relative z-[1] flex w-full flex-col px-[3px] pt-2 pb-1.5"
        style={{ height: BODY_HEIGHT_PX }}
      >
        {showDetails && brand && (
          <div
            className="mb-1 overflow-hidden"
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
        <TerminalRow
          modules={modules}
          side="bottom"
          deviceId={device.id}
          interactive={interactiveTerminals}
          highlightKey={highlightTerminalKey}
          onTerminalPointerDown={onTerminalPointerDown}
        />
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
  brand,
  showDetails = true,
  interactiveTerminals = false,
  highlightTerminalKey = null,
  onTerminalPointerDown,
}: {
  device: Device;
  modules: number;
  selected: boolean;
  showTerminals: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  brand?: ReactNode;
  showDetails?: boolean;
  interactiveTerminals?: boolean;
  highlightTerminalKey?: string | null;
  onTerminalPointerDown?: (
    terminal: { deviceId: number; side: "top" | "bottom"; index: number },
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  const width = modules * MODULE_PX;

  return (
    <div
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        boxSizing: "border-box",
      }}
      className={cn(
        "relative block origin-center select-none",
        selected &&
          "rounded-[8px] ring-2 ring-zinc-900 ring-offset-2 ring-offset-white",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-x-0 z-[1] p-0"
        style={{
          top: showTerminals ? TERMINAL_HEIGHT_PX : 0,
          bottom: showTerminals ? TERMINAL_HEIGHT_PX : 0,
          touchAction: "manipulation",
        }}
        aria-label={device.name}
      />
      <DeviceFaceStatic
        device={device}
        modules={modules}
        showTerminals={showTerminals}
        brand={brand}
        showDetails={showDetails}
        interactiveTerminals={interactiveTerminals}
        highlightTerminalKey={highlightTerminalKey}
        onTerminalPointerDown={onTerminalPointerDown}
      />
    </div>
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
