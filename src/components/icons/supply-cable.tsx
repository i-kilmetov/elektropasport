"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  SUPPLY_DEVICE_ID,
  supplyCoresForNetwork,
  type SupplyCoreDef,
} from "@/lib/supply-infeed";
import { terminalKey } from "@/lib/panel-wires";
import type { TerminalRef } from "@/types";
import type { PointerEvent } from "react";

type Wire = {
  fill: string;
  pe?: boolean;
  label?: string;
};

/** Build visible cores for the progressive network-params preview. */
export function wiresForSupplyPreview(
  phases: "1" | "3" | null,
  hasGround: boolean | null,
): Wire[] {
  if (!phases) return [];
  return supplyCoresForNetwork(phases, hasGround === true).map((core) => ({
    fill: core.color,
    pe: core.pe,
    label: core.label,
  }));
}

export function GroundSymbol({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M8 2.5v6.5M3.5 9h9M4.75 11.2h6.5M6 13.3h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PePatternDefs({ patternId }: { patternId: string }) {
  return (
    <defs>
      <pattern
        id={patternId}
        width="3.2"
        height="3.2"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="3.2" height="3.2" fill="#CA8A04" />
        <rect width="1.5" height="3.2" fill="#166534" />
      </pattern>
    </defs>
  );
}

export function SupplyCableIcon({
  phases,
  hasGround,
  coreScale = 1,
  className,
}: {
  phases: "1" | "3" | null;
  hasGround: boolean | null;
  /** Visual thickness of cores (1 = default). */
  coreScale?: number;
  className?: string;
}) {
  const wires = wiresForSupplyPreview(phases, hasGround);
  if (wires.length === 0) return null;

  const core = 7 * Math.min(1.55, Math.max(0.85, coreScale));
  const gap = 1.6;
  const padX = 5;
  const padY = 4.5;
  const innerW = wires.length * core + (wires.length - 1) * gap;
  const width = innerW + padX * 2;
  const height = core + padY * 2;
  const patternId = `pe-stripe-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={Math.round(width * 1.15)}
      height={Math.round(height * 1.15)}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <PePatternDefs patternId={patternId} />
      <rect
        x="0.6"
        y="0.6"
        width={width - 1.2}
        height={height - 1.2}
        rx={height / 2}
        fill="#E4E4E7"
        stroke="#A1A1AA"
        strokeWidth="1.1"
      />
      {wires.map((wire, index) => {
        const cx = padX + core / 2 + index * (core + gap);
        const cy = height / 2;
        return (
          <g key={`${wire.label ?? wire.fill}-${index}`}>
            <circle
              cx={cx}
              cy={cy}
              r={core / 2}
              fill={wire.pe ? `url(#${patternId})` : wire.fill}
              stroke="rgba(0,0,0,0.22)"
              strokeWidth="0.45"
            />
            <circle
              cx={cx}
              cy={cy}
              r={Math.max(0.9, 1.15 * (core / 7))}
              fill="#D4D4D8"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="0.3"
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Interactive infeed cable above the panel in terminals mode. */
export function SupplyInfeedSource({
  phases,
  hasGround,
  usedIndexes,
  highlightKey,
  interactive,
  onTerminalPointerDown,
  className,
}: {
  phases: "1" | "3";
  hasGround: boolean;
  usedIndexes: Set<number>;
  highlightKey?: string | null;
  interactive?: boolean;
  onTerminalPointerDown?: (
    terminal: TerminalRef,
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  className?: string;
}) {
  const cores = supplyCoresForNetwork(phases, hasGround);
  if (cores.length === 0) return null;

  const corePx = 18;
  const gapPx = 4;
  const padX = 12;
  const padY = 10;
  const width = cores.length * corePx + (cores.length - 1) * gapPx + padX * 2;
  const height = corePx + padY * 2;
  const patternId = `pe-infeed-${useId().replace(/:/g, "")}`;

  return (
    <div
      data-supply-face={SUPPLY_DEVICE_ID}
      className={cn(
        "relative inline-flex flex-col items-center gap-1",
        className,
      )}
      aria-label="Вводной кабель"
    >
      <span className="ty-badge text-zinc-500">Ввод</span>
      <div
        className="relative"
        style={{ width, height }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="absolute inset-0"
          aria-hidden
        >
          <PePatternDefs patternId={patternId} />
          <rect
            x="0.8"
            y="0.8"
            width={width - 1.6}
            height={height - 1.6}
            rx={height / 2}
            fill="#E4E4E7"
            stroke="#A1A1AA"
            strokeWidth="1.2"
          />
          {cores.map((core, index) => {
            const cx = padX + corePx / 2 + index * (corePx + gapPx);
            const cy = height / 2;
            const used = usedIndexes.has(core.index);
            return (
              <g
                key={core.label}
                opacity={used ? 0.35 : 1}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={corePx / 2 - 0.5}
                  fill={core.pe ? `url(#${patternId})` : core.color}
                  stroke="rgba(0,0,0,0.22)"
                  strokeWidth="0.6"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={2.4}
                  fill="#D4D4D8"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth="0.35"
                />
              </g>
            );
          })}
        </svg>
        {cores.map((core, index) => {
          const left = padX + index * (corePx + gapPx);
          const terminal = {
            deviceId: SUPPLY_DEVICE_ID,
            side: "bottom" as const,
            index: core.index,
          };
          const key = terminalKey(terminal);
          const used = usedIndexes.has(core.index);
          const active = highlightKey === key;
          const canStart = interactive && !used && onTerminalPointerDown;

          if (!canStart) {
            return (
              <span
                key={key}
                data-terminal={key}
                className="absolute"
                style={{
                  left,
                  top: padY,
                  width: corePx,
                  height: corePx,
                }}
                aria-hidden
              />
            );
          }

          return (
            <button
              key={key}
              type="button"
              data-terminal={key}
              aria-label={`Жила ввода ${core.label}`}
              className={cn(
                "absolute touch-none rounded-full",
                active && "ring-2 ring-zinc-900/40 ring-offset-1",
              )}
              style={{
                left,
                top: padY,
                width: corePx,
                height: corePx,
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onTerminalPointerDown(terminal, event);
              }}
              onClick={(event) => event.stopPropagation()}
            />
          );
        })}
      </div>
      <CoreLabels cores={cores} usedIndexes={usedIndexes} />
    </div>
  );
}

function CoreLabels({
  cores,
  usedIndexes,
}: {
  cores: SupplyCoreDef[];
  usedIndexes: Set<number>;
}) {
  return (
    <div className="flex items-center gap-1">
      {cores.map((core) => (
        <span
          key={core.label}
          className={cn(
            "min-w-[1.1rem] text-center text-[10px] font-medium leading-none",
            usedIndexes.has(core.index) ? "text-zinc-300" : "text-zinc-500",
          )}
        >
          {core.label}
        </span>
      ))}
    </div>
  );
}
