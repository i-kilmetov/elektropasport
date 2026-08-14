"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type Wire = {
  fill: string;
  pe?: boolean;
};

function wiresFor(phases: "1" | "3", hasGround: boolean): Wire[] {
  const phaseWires: Wire[] =
    phases === "3"
      ? [
          { fill: "#B45309" },
          { fill: "#18181B" },
          { fill: "#A1A1AA" },
        ]
      : [{ fill: "#B45309" }];
  const wires = [...phaseWires, { fill: "#2563EB" }];
  if (hasGround) wires.push({ fill: "#EAB308", pe: true });
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
  className,
}: {
  phases: "1" | "3";
  hasGround: boolean;
  className?: string;
}) {
  const wires = wiresFor(phases, hasGround);
  const core = 7;
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
          <g key={`${wire.fill}-${index}`}>
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
              r={1.15}
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
