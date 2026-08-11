"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

/** DIN module ≈ 18 mm; body face ≈ 80–85 mm → ~1 : 4.5 */
export const MODULE_PX = 36;
export const BODY_HEIGHT_PX = 162;
export const TERMINAL_HEIGHT_PX = 22;

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
  if (/63|40|32|25/.test(rating)) return "230";
  return "230";
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
        "relative z-[1] flex w-full shrink-0 items-center justify-around bg-zinc-400/70",
        side === "top" ? "rounded-t-[6px] border-b border-zinc-500/40" : "rounded-b-[6px] border-t border-zinc-500/40",
      )}
      style={{ height: TERMINAL_HEIGHT_PX }}
      aria-hidden
    >
      {Array.from({ length: modules }, (_, i) => (
        <span
          key={i}
          className="flex h-[14px] w-[14px] items-center justify-center rounded-[2px] bg-zinc-500/80 shadow-inner"
        >
          <span className="h-[5px] w-[5px] rounded-full bg-zinc-700 ring-1 ring-zinc-300/50" />
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
          className="pointer-events-none absolute inset-y-0 z-0 w-px bg-zinc-500/40"
          style={{ left: `${((i + 1) / modules) * 100}%` }}
        />
      ))}
    </>
  );
}

function BreakerLevers({ count }: { count: number }) {
  return (
    <div className="flex flex-1 items-center justify-around px-0.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className="h-8 w-[10px] rounded-[3px] bg-gradient-to-b from-rose-400 to-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.25)]" />
          <span className="h-1 w-1 rounded-full bg-emerald-500/90" />
        </div>
      ))}
    </div>
  );
}

function TestButton() {
  return (
    <span
      className="mx-auto mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[7px] font-bold text-amber-950 shadow-sm"
      aria-hidden
    >
      T
    </span>
  );
}

function VoltageScreen({ value }: { value: string }) {
  return (
    <div className="mx-auto mt-1 flex w-[calc(100%-6px)] flex-col items-center rounded-[3px] bg-[#0a1a12] px-1 py-1 shadow-inner ring-1 ring-zinc-600/60">
      <span className="font-mono text-[11px] font-bold leading-none tracking-tight text-emerald-400 tabular-nums">
        {value}
      </span>
      <span className="mt-0.5 text-[6px] font-medium uppercase tracking-wider text-emerald-600/80">
        V
      </span>
    </div>
  );
}

function SpdWindows({ modules }: { modules: number }) {
  return (
    <div className="flex flex-1 items-center justify-around px-0.5">
      {Array.from({ length: modules }, (_, i) => (
        <span
          key={i}
          className="h-5 w-3 rounded-[2px] bg-gradient-to-b from-emerald-300 to-emerald-600 shadow-inner ring-1 ring-zinc-500/40"
        />
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
      return <BreakerLevers count={levers} />;
    case "rcd":
      return (
        <div className="flex flex-1 flex-col items-stretch justify-center gap-1 py-1">
          <BreakerLevers count={Math.max(1, Math.min(levers, 2))} />
          <TestButton />
        </div>
      );
    case "diff_breaker":
    case "afdd":
      return (
        <div className="flex flex-1 flex-col items-stretch justify-center gap-0.5 py-0.5">
          <BreakerLevers count={levers} />
          <TestButton />
        </div>
      );
    case "voltage_relay":
      return (
        <div className="flex flex-1 flex-col items-center justify-center py-1">
          <VoltageScreen value={parseVoltageHint(device.rating)} />
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
        </div>
      );
    case "spd":
      return <SpdWindows modules={modules} />;
    default:
      return <BreakerLevers count={levers} />;
  }
}

const statusBarClass: Record<Device["status"], string> = {
  verified: "bg-emerald-400",
  pending: "bg-amber-400",
  unknown: "bg-white/35",
};

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
  onSelect: () => void;
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
        "relative flex w-full min-w-0 flex-col overflow-hidden rounded-[8px] border border-zinc-500/70 bg-zinc-300 text-left text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-shadow",
        selected &&
          "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[#0B0B0F]",
      )}
    >
      <ModuleDividers modules={modules} />
      {showTerminals && <TerminalRow modules={modules} side="top" />}
      <div
        className="relative z-[1] flex w-full flex-col px-1 pt-1 pb-1"
        style={{ height: BODY_HEIGHT_PX }}
      >
        {brand && <div className="mb-0.5 flex justify-start">{brand}</div>}
        <DeviceFunction
          type={device.type}
          device={device}
          modules={modules}
        />
        <div className="mt-auto space-y-0.5">
          <div className="text-left text-[9px] font-semibold tabular-nums leading-tight text-zinc-800">
            {device.rating}
          </div>
          {device.poles && (
            <div className="text-left text-[8px] leading-tight text-zinc-600">
              {device.poles}
            </div>
          )}
        </div>
      </div>
      {showTerminals && <TerminalRow modules={modules} side="bottom" />}
    </button>
  );
}

export function DeviceStatusBar({ status }: { status: Device["status"] }) {
  return (
    <span
      aria-hidden
      className={cn("mt-1 block h-[3px] w-full rounded-full", statusBarClass[status])}
    />
  );
}
