"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

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
  const wires: Wire[] = [];

  if (phases === "1") {
    wires.push({ fill: "#B45309", label: "L" });
    wires.push({ fill: "#2563EB", label: "N" });
  } else if (phases === "3") {
    wires.push({ fill: "#B45309", label: "L1" });
    wires.push({ fill: "#18181B", label: "L2" });
    wires.push({ fill: "#A1A1AA", label: "L3" });
    wires.push({ fill: "#2563EB", label: "N" });
  }

  if (hasGround === true) {
    wires.push({ fill: "#EAB308", pe: true, label: "PE" });
  }

  return wires;
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
      <defs>
        <pattern
          id={patternId}
          width="3.2"
          height="3.2"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="3.2" height="3.2" fill="#EAB308" />
          <rect width="1.5" height="3.2" fill="#16A34A" />
        </pattern>
      </defs>
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
