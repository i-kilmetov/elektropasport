"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

/** DIN module ≈ 18 mm; body face ≈ 80–85 mm → ~1 : 4.5 */
export const MODULE_PX = 36;
export const BODY_HEIGHT_PX = 162;
export const TERMINAL_HEIGHT_PX = 22;
/** Gap between neighboring devices on the rail */
export const DEVICE_GAP_PX = 6;

function leverCount(device: Device, modules: number): number {
  const poles = device.poles ?? "";
  if (poles.includes("4") || poles === "3P+N") return Math.min(4, modules);
  if (poles.includes("3")) return Math.min(3, modules);
  if (poles.includes("2") || poles.includes("+N")) return Math.min(2, modules);
  if (poles.includes("1")) return 1;
  return modules;
}

function parseVoltageHint(rating: string): string {
  const match = rating.match(/(\d{2,3})\s*V/i);
  if (match) return match[1];
  return "230";
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

function TerminalRow({
  modules,
  side,
}: {
  modules: number;
  side: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "relative z-[1] flex w-full shrink-0 items-center justify-around bg-zinc-400/80",
        side === "top"
          ? "rounded-t-[5px] border-b border-zinc-500/50"
          : "rounded-b-[5px] border-t border-zinc-500/50",
      )}
      style={{ height: TERMINAL_HEIGHT_PX }}
      aria-hidden
    >
      {Array.from({ length: modules }, (_, i) => (
        <span
          key={i}
          className="flex h-[15px] w-[15px] items-center justify-center rounded-[2px] bg-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
        >
          <span className="h-[6px] w-[6px] rounded-[1px] bg-zinc-700 ring-1 ring-zinc-300/40" />
        </span>
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
          className="pointer-events-none absolute inset-y-0 z-0 w-px bg-zinc-500/45"
          style={{ left: `${((i + 1) / modules) * 100}%` }}
        />
      ))}
    </>
  );
}

/** Rocker paddle — almost full width of one DIN module, like a real MCB. */
function RockerLever({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-[52px] w-full flex-col items-center justify-end",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-x-[2px] top-0 bottom-1 rounded-[4px] bg-zinc-500/25 shadow-inner" />
      <div className="relative z-[1] mb-0.5 flex h-[44px] w-[calc(100%-4px)] flex-col overflow-hidden rounded-[4px] bg-gradient-to-b from-rose-400 via-rose-600 to-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_3px_rgba(0,0,0,0.28)]">
        <span className="mx-auto mt-1.5 h-[3px] w-[55%] rounded-full bg-white/35" />
        <span className="mx-auto mt-auto mb-1.5 h-[2px] w-[40%] rounded-full bg-black/25" />
      </div>
      <span className="absolute bottom-0 left-1/2 z-[2] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-emerald-400 ring-1 ring-emerald-700/40" />
    </div>
  );
}

function BreakerLevers({ count, modules }: { count: number; modules: number }) {
  const cols = Math.max(count, 1);
  return (
    <div
      className="grid w-full flex-1 items-center gap-0 px-[1px]"
      style={{ gridTemplateColumns: `repeat(${modules}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: modules }, (_, i) => (
        <div key={i} className="flex min-w-0 items-center justify-center px-[1px]">
          {i < cols ? <RockerLever /> : <span className="h-[52px]" />}
        </div>
      ))}
    </div>
  );
}

/** Single wide rocker spanning several modules (typical RCD). */
function WideRocker({ modules }: { modules: number }) {
  return (
    <div className="flex w-full items-center px-[2px]" aria-hidden>
      <div className="relative flex h-[40px] w-full items-end justify-center">
        <div className="absolute inset-x-0 top-0 bottom-1 rounded-[4px] bg-zinc-500/20 shadow-inner" />
        <div className="relative z-[1] mb-0.5 flex h-[34px] w-full flex-col overflow-hidden rounded-[4px] bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_3px_rgba(0,0,0,0.22)]">
          <span className="mx-auto mt-1.5 h-[3px] w-[30%] rounded-full bg-zinc-500/35" />
          <span className="mx-auto mt-auto mb-1 text-[7px] font-bold tracking-wide text-zinc-600/80">
            ON
          </span>
        </div>
        {modules > 1 &&
          Array.from({ length: modules - 1 }, (_, i) => (
            <span
              key={i}
              className="pointer-events-none absolute inset-y-1 z-[2] w-px bg-zinc-500/30"
              style={{ left: `${((i + 1) / modules) * 100}%` }}
            />
          ))}
      </div>
    </div>
  );
}

function TestButton() {
  return (
    <div className="flex w-full justify-center px-[2px]" aria-hidden>
      <span className="flex h-[18px] w-full max-w-full items-center justify-center rounded-[3px] bg-gradient-to-b from-amber-300 to-amber-500 text-[8px] font-extrabold tracking-wide text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.2)] ring-1 ring-amber-700/30">
        TEST
      </span>
    </div>
  );
}

function VoltageScreen({ value }: { value: string }) {
  return (
    <div
      className="flex w-full flex-col items-stretch px-[2px]"
      style={{ maxWidth: MODULE_PX * 2 }}
      aria-hidden
    >
      <div className="flex min-h-[36px] flex-col items-center justify-center rounded-[3px] bg-[#07140e] px-1 py-1.5 shadow-inner ring-1 ring-zinc-600/70">
        <span className="font-mono text-[13px] font-bold leading-none tracking-tight text-emerald-400 tabular-nums">
          {value}
        </span>
        <span className="mt-0.5 text-[6px] font-semibold uppercase tracking-wider text-emerald-600/90">
          VAC
        </span>
      </div>
      <div className="mt-1.5 flex justify-center gap-1">
        <span className="h-[10px] w-[14px] rounded-[2px] bg-zinc-500/80 shadow-inner" />
        <span className="h-[10px] w-[14px] rounded-[2px] bg-zinc-500/80 shadow-inner" />
      </div>
      <span className="mx-auto mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)]" />
    </div>
  );
}

function SpdWindows({ modules }: { modules: number }) {
  return (
    <div
      className="grid w-full flex-1 items-center gap-0 px-[2px]"
      style={{ gridTemplateColumns: `repeat(${modules}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: modules }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 px-[2px]">
          <span className="h-7 w-full rounded-[3px] bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-inner ring-1 ring-zinc-500/50" />
          <span className="h-1.5 w-full rounded-sm bg-zinc-500/50" />
        </div>
      ))}
    </div>
  );
}

function DeviceFunction({
  type,
  device,
  modules,
}: {
  type: DeviceType;
  device: Device;
  modules: number;
}) {
  const levers = leverCount(device, modules);

  switch (type) {
    case "breaker":
    case "main_breaker":
      return <BreakerLevers count={levers} modules={modules} />;
    case "rcd":
      return (
        <div className="flex flex-1 flex-col items-stretch justify-center gap-2 py-1">
          <WideRocker modules={modules} />
          <TestButton />
        </div>
      );
    case "diff_breaker":
    case "afdd":
      return (
        <div className="flex flex-1 flex-col items-stretch justify-center gap-1.5 py-0.5">
          <BreakerLevers count={levers} modules={modules} />
          <TestButton />
        </div>
      );
    case "voltage_relay":
      return (
        <div className="flex flex-1 flex-col items-start justify-center py-1">
          <VoltageScreen value={parseVoltageHint(device.rating)} />
        </div>
      );
    case "spd":
      return <SpdWindows modules={modules} />;
    default:
      return <BreakerLevers count={levers} modules={modules} />;
  }
}

function RatingBlock({ rating, poles }: { rating: string; poles?: string }) {
  const lines = splitRatingLines(rating);
  return (
    <div
      className="mt-auto space-y-0.5 overflow-hidden"
      style={{ maxWidth: MODULE_PX - 4, width: MODULE_PX - 4 }}
    >
      {lines.map((line) => (
        <div
          key={line}
          className="break-all text-left text-[9px] font-semibold leading-[1.15] text-zinc-800 tabular-nums"
        >
          {line}
        </div>
      ))}
      {poles && (
        <div className="text-left text-[8px] leading-tight text-zinc-600">
          {poles}
        </div>
      )}
    </div>
  );
}

const statusBarClass: Record<Device["status"], string> = {
  verified: "bg-emerald-400",
  pending: "bg-amber-400",
  unknown: "bg-white/35",
};

export function deviceFaceHeight(showTerminals: boolean): number {
  return BODY_HEIGHT_PX + (showTerminals ? TERMINAL_HEIGHT_PX * 2 : 0);
}

export function DeviceFaceStatic({
  device,
  modules,
  showTerminals = false,
  brand,
  className,
}: {
  device: Device;
  modules: number;
  showTerminals?: boolean;
  brand?: ReactNode;
  className?: string;
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
        "relative flex w-full min-w-0 flex-col overflow-hidden rounded-[7px] border border-zinc-500/70 bg-zinc-300 text-left text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
        className,
      )}
    >
      <ModuleDividers modules={modules} />
      {showTerminals && <TerminalRow modules={modules} side="top" />}
      <div
        className="relative z-[1] flex w-full flex-col px-[2px] pt-1 pb-1"
        style={{ height: BODY_HEIGHT_PX }}
      >
        {brand && (
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
        />
        <RatingBlock rating={device.rating} poles={device.poles} />
      </div>
      {showTerminals && <TerminalRow modules={modules} side="bottom" />}
    </div>
  );
}

export function DeviceMiniPreview({
  device,
  scale = 0.38,
  showTerminals = false,
  brand,
}: {
  device: Device;
  scale?: number;
  showTerminals?: boolean;
  brand?: ReactNode;
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
}: {
  device: Device;
  modules: number;
  selected: boolean;
  showTerminals: boolean;
  onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
  brand?: ReactNode;
}) {
  const width = modules * MODULE_PX;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        boxSizing: "border-box",
      }}
      className={cn(
        "block p-0 transition-shadow",
        selected &&
          "rounded-[7px] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-white",
      )}
    >
      <DeviceFaceStatic
        device={device}
        modules={modules}
        showTerminals={showTerminals}
        brand={brand}
      />
    </button>
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
