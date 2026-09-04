"use client";

import { useMemo } from "react";
import {
  parseTerminalKey,
  terminalKey,
  wireStrokeWidth,
} from "@/lib/panel-wires";
import type { PanelWire, TerminalRef } from "@/types";

type Point = { x: number; y: number };
type AnchoredPoint = Point & { side: "top" | "bottom" };

/** Minimal vertical stub length after leaving the device edge. */
const STUB_PX = 12;
/** Fixed arc height for every cable — same visual bulge. */
const ARC_BULGE_PX = 36;

/**
 * Wire attaches at the outer edge of the device face (top/bottom),
 * on the same X axis as the terminal screw — not at the screw center.
 */
export function terminalAnchor(
  container: HTMLElement,
  terminal: TerminalRef,
): AnchoredPoint | null {
  const key = terminalKey(terminal);
  const screw = container.querySelector(`[data-terminal="${key}"]`);
  if (!(screw instanceof HTMLElement)) return null;

  const device =
    screw.closest("[data-device-face]") ??
    screw.closest("[data-supply-face]") ??
    container.querySelector(`[data-device-face="${terminal.deviceId}"]`) ??
    container.querySelector(`[data-supply-face="${terminal.deviceId}"]`);
  if (!(device instanceof HTMLElement)) return null;

  const c = container.getBoundingClientRect();
  const s = screw.getBoundingClientRect();
  const d = device.getBoundingClientRect();
  const x = s.left + s.width / 2 - c.left + container.scrollLeft;
  const y =
    terminal.side === "top"
      ? d.top - c.top + container.scrollTop
      : d.bottom - c.top + container.scrollTop;

  return { x, y, side: terminal.side };
}

function outward(point: AnchoredPoint, distance = STUB_PX): Point {
  return {
    x: point.x,
    y: point.side === "top" ? point.y - distance : point.y + distance,
  };
}

/**
 * Vertical stub out of each terminal, then a cubic arc of fixed height.
 */
export function wirePath(from: AnchoredPoint, to: AnchoredPoint): string {
  const fromOut = outward(from);
  const toOut = outward(to);
  const bulge = ARC_BULGE_PX;

  let c1: Point;
  let c2: Point;

  if (from.side === "top" && to.side === "top") {
    const apex = Math.min(fromOut.y, toOut.y) - bulge;
    c1 = { x: fromOut.x, y: apex };
    c2 = { x: toOut.x, y: apex };
  } else if (from.side === "bottom" && to.side === "bottom") {
    const apex = Math.max(fromOut.y, toOut.y) + bulge;
    c1 = { x: fromOut.x, y: apex };
    c2 = { x: toOut.x, y: apex };
  } else {
    // Opposite sides: keep stubs outward, then S-curve of the same bulge.
    const midX = (fromOut.x + toOut.x) / 2;
    c1 = {
      x: midX,
      y: fromOut.y + (from.side === "top" ? -bulge : bulge),
    };
    c2 = {
      x: midX,
      y: toOut.y + (to.side === "top" ? -bulge : bulge),
    };
  }

  return [
    `M ${from.x} ${from.y}`,
    `L ${fromOut.x} ${fromOut.y}`,
    `C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${toOut.x} ${toOut.y}`,
    `L ${to.x} ${to.y}`,
  ].join(" ");
}

function draftWirePath(from: AnchoredPoint, cursor: Point): string {
  const fromOut = outward(from);
  const bulge = ARC_BULGE_PX;
  const tip = outward(from, STUB_PX + bulge);
  // Rise vertically, then arc toward the finger.
  return [
    `M ${from.x} ${from.y}`,
    `L ${fromOut.x} ${fromOut.y}`,
    `Q ${tip.x} ${tip.y}, ${cursor.x} ${cursor.y}`,
  ].join(" ");
}

export function PanelWiresSvg({
  container,
  wires,
  draft,
  layoutTick = 0,
  onWireClick,
}: {
  container: HTMLElement | null;
  wires: PanelWire[];
  draft?: {
    from: TerminalRef;
    x: number;
    y: number;
  } | null;
  /** Bump after layout changes (terminals toggle, resize) to remeasure anchors. */
  layoutTick?: number;
  onWireClick?: (wire: PanelWire) => void;
}) {
  const geometry = useMemo(() => {
    if (!container) return [] as Array<{ wire: PanelWire; d: string }>;
    void layoutTick;
    return wires
      .map((wire) => {
        const from = terminalAnchor(container, wire.from);
        const to = terminalAnchor(container, wire.to);
        if (!from || !to) return null;
        return { wire, d: wirePath(from, to) };
      })
      .filter((item): item is { wire: PanelWire; d: string } => Boolean(item));
  }, [container, wires, layoutTick]);

  const draftGeometry = useMemo(() => {
    if (!container || !draft) return null;
    void layoutTick;
    const from = terminalAnchor(container, draft.from);
    if (!from) return null;
    const c = container.getBoundingClientRect();
    const cursor = {
      x: draft.x - c.left + container.scrollLeft,
      y: draft.y - c.top + container.scrollTop,
    };
    return { d: draftWirePath(from, cursor) };
  }, [container, draft, layoutTick]);

  if (!container) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
      width={container.scrollWidth || container.clientWidth}
      height={container.scrollHeight || container.clientHeight}
    >
      {geometry.map(({ wire, d }) => {
        const pe = wire.color === "#CA8A04";
        return (
          <g key={wire.id}>
            <path
              d={d}
              fill="none"
              stroke={wire.color}
              strokeWidth={wireStrokeWidth(wire.thicknessMm)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pe ? "5 4" : undefined}
              className={onWireClick ? "pointer-events-auto cursor-pointer" : undefined}
              onClick={
                onWireClick
                  ? (e) => {
                      e.stopPropagation();
                      onWireClick(wire);
                    }
                  : undefined
              }
            />
            {onWireClick && (
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(14, wireStrokeWidth(wire.thicknessMm) + 10)}
                strokeLinecap="round"
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onWireClick(wire);
                }}
              />
            )}
          </g>
        );
      })}
      {draftGeometry && (
        <path
          d={draftGeometry.d}
          fill="none"
          stroke="#52525B"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 4"
          opacity={0.85}
        />
      )}
    </svg>
  );
}

export function findTerminalAtPoint(
  clientX: number,
  clientY: number,
): TerminalRef | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!(el instanceof Element)) continue;
    const host = el.closest("[data-terminal]");
    if (!(host instanceof HTMLElement)) continue;
    const key = host.dataset.terminal;
    if (!key) continue;
    const parsed = parseTerminalKey(key);
    if (parsed) return parsed;
  }
  return null;
}
