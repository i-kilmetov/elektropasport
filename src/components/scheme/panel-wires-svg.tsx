"use client";

import { useMemo } from "react";
import {
  parseTerminalKey,
  terminalKey,
  wireStrokeWidth,
} from "@/lib/panel-wires";
import type { PanelWire, TerminalRef } from "@/types";

type Point = { x: number; y: number };

function terminalCenter(
  container: HTMLElement,
  terminal: TerminalRef,
): Point | null {
  const el = container.querySelector(
    `[data-terminal="${terminalKey(terminal)}"]`,
  );
  if (!(el instanceof HTMLElement)) return null;
  const c = container.getBoundingClientRect();
  const t = el.getBoundingClientRect();
  return {
    x: t.left + t.width / 2 - c.left + container.scrollLeft,
    y: t.top + t.height / 2 - c.top + container.scrollTop,
  };
}

function wirePath(from: Point, to: Point): string {
  const dx = Math.abs(to.x - from.x);
  const dy = to.y - from.y;
  const bend = Math.max(18, Math.min(56, dx * 0.35 + Math.abs(dy) * 0.15));
  if (Math.abs(dy) < 8) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  // Route with a soft vertical-ish curve between rails / terminals.
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + Math.sign(dy || 1) * bend}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}

export function PanelWiresSvg({
  container,
  wires,
  draft,
  onWireClick,
}: {
  container: HTMLElement | null;
  wires: PanelWire[];
  draft?: {
    from: TerminalRef;
    x: number;
    y: number;
  } | null;
  onWireClick?: (wire: PanelWire) => void;
}) {
  const geometry = useMemo(() => {
    if (!container) return [] as Array<{ wire: PanelWire; d: string }>;
    return wires
      .map((wire) => {
        const from = terminalCenter(container, wire.from);
        const to = terminalCenter(container, wire.to);
        if (!from || !to) return null;
        return { wire, d: wirePath(from, to) };
      })
      .filter((item): item is { wire: PanelWire; d: string } => Boolean(item));
  }, [container, wires]);

  const draftGeometry = useMemo(() => {
    if (!container || !draft) return null;
    const from = terminalCenter(container, draft.from);
    if (!from) return null;
    const c = container.getBoundingClientRect();
    const to = {
      x: draft.x - c.left + container.scrollLeft,
      y: draft.y - c.top + container.scrollTop,
    };
    return { d: wirePath(from, to), from };
  }, [container, draft]);

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
            {/* Wider invisible hit target */}
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
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const host = el.closest("[data-terminal]");
  if (!(host instanceof HTMLElement)) return null;
  const key = host.dataset.terminal;
  if (!key) return null;
  return parseTerminalKey(key);
}
