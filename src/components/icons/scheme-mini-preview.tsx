"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

const SIZE = 56;
const PAD = 5;

function deviceModules(device: Device): number {
  if (device.modules && device.modules > 0) return device.modules;
  return 1;
}

function groupRails(
  devices: Device[] | undefined,
  railCount?: number,
): Device[][] {
  const list = (devices ?? []).filter(
    (d) => d.type !== "pe_bus" && d.type !== "n_bus",
  );
  const maxRail =
    list.reduce((max, d) => Math.max(max, d.rail ?? 0), 0) + 1;
  const numRails = Math.max(1, Math.min(4, railCount ?? maxRail));
  const rails: Device[][] = Array.from({ length: numRails }, () => []);
  for (const device of list) {
    const rail = Math.min(Math.max(device.rail ?? 0, 0), numRails - 1);
    rails[rail].push(device);
  }
  return rails;
}

function faceFill(type: DeviceType): string {
  switch (type) {
    case "voltage_relay":
      return "#0b1a12";
    case "spd":
      return "#d4d4d8";
    case "rcd":
    case "diff_breaker":
      return "#d4d4d8";
    default:
      return "#c4c4cc";
  }
}

function accentFill(type: DeviceType): string | null {
  switch (type) {
    case "main_breaker":
    case "breaker":
    case "afdd":
    case "diff_breaker":
      return "#e11d48";
    case "rcd":
      return "#f59e0b";
    case "voltage_relay":
      return "#34d399";
    case "spd":
      return "#10b981";
    default:
      return null;
  }
}

function statusFill(status: Device["status"]): string {
  if (status === "verified") return "#34d399";
  if (status === "pending") return "#fbbf24";
  return "rgba(255,255,255,0.35)";
}

export function SchemeMiniPreview({
  devices,
  railCount,
  className,
}: {
  devices?: Device[];
  railCount?: number;
  className?: string;
}) {
  const gradId = `din-${useId().replace(/:/g, "")}`;
  const rails = groupRails(devices, railCount);
  const moduleTotals = rails.map((rail) =>
    Math.max(
      1,
      rail.reduce((sum, d) => sum + deviceModules(d), 0),
    ),
  );
  const maxModules = Math.max(6, ...moduleTotals);
  const inner = SIZE - PAD * 2;
  const railGap = rails.length > 1 ? 2.5 : 0;
  const railBand =
    (inner - railGap * Math.max(0, rails.length - 1)) / rails.length;
  const deviceH = Math.max(6, railBand * 0.72);
  const moduleW = inner / maxModules;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4d4d8" />
          <stop offset="50%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#71717a" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={SIZE} height={SIZE} rx={14} fill="#121218" />
      <rect
        x={1.5}
        y={1.5}
        width={SIZE - 3}
        height={SIZE - 3}
        rx={12.5}
        fill="#1a1a22"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />

      {rails.map((rail, railIndex) => {
        const y0 = PAD + railIndex * (railBand + railGap);
        const railY = y0 + railBand * 0.12;
        const deviceY = y0 + (railBand - deviceH) / 2;
        let x = PAD;

        return (
          <g key={railIndex}>
            <rect
              x={PAD}
              y={railY}
              width={inner}
              height={Math.max(2, railBand * 0.22)}
              rx={1}
              fill={`url(#${gradId})`}
            />
            {rail.map((device) => {
              const modules = deviceModules(device);
              const w = Math.max(2.2, modules * moduleW - 0.6);
              const dx = x;
              x += modules * moduleW;
              const accent = accentFill(device.type);
              return (
                <g key={device.id}>
                  <rect
                    x={dx}
                    y={deviceY}
                    width={w}
                    height={deviceH}
                    rx={1.2}
                    fill={faceFill(device.type)}
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth={0.4}
                  />
                  {accent && device.type !== "spd" && (
                    <rect
                      x={dx + w * 0.18}
                      y={deviceY + deviceH * 0.18}
                      width={w * 0.64}
                      height={deviceH * 0.42}
                      rx={0.8}
                      fill={accent}
                      opacity={device.type === "voltage_relay" ? 0.9 : 0.85}
                    />
                  )}
                  {device.type === "spd" && (
                    <>
                      <rect
                        x={dx + 0.8}
                        y={deviceY + deviceH * 0.2}
                        width={(w - 2) / 2 - 0.4}
                        height={deviceH * 0.45}
                        rx={0.6}
                        fill={accent ?? "#10b981"}
                      />
                      <rect
                        x={dx + w / 2 + 0.2}
                        y={deviceY + deviceH * 0.2}
                        width={(w - 2) / 2 - 0.4}
                        height={deviceH * 0.45}
                        rx={0.6}
                        fill={accent ?? "#10b981"}
                      />
                    </>
                  )}
                  <rect
                    x={dx + 0.4}
                    y={deviceY + deviceH - 1.6}
                    width={w - 0.8}
                    height={1.2}
                    rx={0.4}
                    fill={statusFill(device.status)}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
