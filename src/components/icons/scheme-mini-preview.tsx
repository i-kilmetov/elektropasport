"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  deviceModules,
  groupDevicesByRail,
  MAX_MODULES_PER_RAIL,
} from "@/lib/panel-rails";
import type { Device, DeviceType } from "@/types";

const SIZE = 56;
const PAD = 5;

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

function MiniDevice({
  device,
  x,
  y,
  w,
  h,
}: {
  device: Device;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const accent = accentFill(device.type);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1.2}
        fill={faceFill(device.type)}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={0.35}
      />
      {accent && device.type !== "spd" && (
        <rect
          x={x + w * 0.18}
          y={y + h * 0.18}
          width={w * 0.64}
          height={h * 0.42}
          rx={0.8}
          fill={accent}
          opacity={device.type === "voltage_relay" ? 0.9 : 0.85}
        />
      )}
      {device.type === "spd" && (
        <>
          <rect
            x={x + 0.8}
            y={y + h * 0.2}
            width={(w - 2) / 2 - 0.4}
            height={h * 0.45}
            rx={0.6}
            fill={accent ?? "#10b981"}
          />
          <rect
            x={x + w / 2 + 0.2}
            y={y + h * 0.2}
            width={(w - 2) / 2 - 0.4}
            height={h * 0.45}
            rx={0.6}
            fill={accent ?? "#10b981"}
          />
        </>
      )}
      <rect
        x={x + 0.4}
        y={y + h - 1.5}
        width={w - 0.8}
        height={1.1}
        rx={0.4}
        fill={statusFill(device.status)}
      />
    </g>
  );
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
  const rails = groupDevicesByRail(devices, railCount);
  const firstRail = rails[0] ?? [];
  const numRails = Math.max(1, rails.length);
  const extraRailCount = Math.max(0, numRails - 1);

  const inner = SIZE - PAD * 2;
  const firstRailModules = Math.min(
    MAX_MODULES_PER_RAIL,
    Math.max(1, firstRail.reduce((sum, device) => sum + deviceModules(device), 0)),
  );
  const moduleW = inner / firstRailModules;

  const stripeH = 2.2;
  const stripeGap = 2;
  const stripesTopPad = extraRailCount > 0 ? 3 : 0;
  const stripesBlockH =
    extraRailCount > 0
      ? stripesTopPad +
        extraRailCount * stripeH +
        Math.max(0, extraRailCount - 1) * stripeGap
      : 0;
  const firstRailBlockH = inner - stripesBlockH;

  const dinBarH = Math.max(2, firstRailBlockH * 0.14);
  const deviceH = Math.max(8, firstRailBlockH * 0.58);
  const railY = PAD + 1.5;
  const deviceY = PAD + (firstRailBlockH - deviceH) / 2 + 1;

  let x = PAD;

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

      <rect x={0} y={0} width={SIZE} height={SIZE} rx={14} fill="#f4f4f5" />
      <rect
        x={1.5}
        y={1.5}
        width={SIZE - 3}
        height={SIZE - 3}
        rx={12.5}
        fill="#fafafa"
        stroke="rgba(17,17,19,0.08)"
        strokeWidth={1}
      />

      <rect
        x={PAD}
        y={railY}
        width={inner}
        height={dinBarH}
        rx={1}
        fill={`url(#${gradId})`}
      />

      {firstRail.map((device) => {
        const modules = deviceModules(device);
        const w = Math.max(2.4, modules * moduleW - 0.55);
        const dx = x;
        x += modules * moduleW;
        return (
          <MiniDevice
            key={device.id}
            device={device}
            x={dx}
            y={deviceY}
            w={w}
            h={deviceH}
          />
        );
      })}

      {Array.from({ length: extraRailCount }, (_, index) => {
        const y =
          PAD +
          firstRailBlockH +
          stripesTopPad +
          index * (stripeH + stripeGap);
        return (
          <rect
            key={`extra-rail-${index}`}
            x={PAD + 1}
            y={y}
            width={inner - 2}
            height={stripeH}
            rx={1}
            fill={`url(#${gradId})`}
            opacity={0.92 - index * 0.08}
          />
        );
      })}
    </svg>
  );
}
