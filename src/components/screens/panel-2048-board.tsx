"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dirFromSwipe, type SwipeDir } from "@/lib/panel-game";
import type { MergeState, MergeTile, MergeVisualStyle } from "@/lib/panel-2048";

const RETRO_PIXELS = 10;

function retroPixelStyle(base: string, edge: string): CSSProperties {
  const step = `${100 / RETRO_PIXELS}%`;
  return {
    backgroundColor: base,
    backgroundImage: `
      linear-gradient(to right, ${edge} 1px, transparent 1px),
      linear-gradient(to bottom, ${edge} 1px, transparent 1px)
    `,
    backgroundSize: `${step} ${step}`,
    imageRendering: "pixelated",
  };
}

function retroCellColors(value: number | null): { base: string; edge: string } {
  if (value == null) return { base: "#6d716d", edge: "rgba(20,24,20,0.42)" };
  if (value >= 512) return { base: "#1a1c1a", edge: "rgba(211,218,0,0.35)" };
  if (value >= 128) return { base: "#3a3e3a", edge: "rgba(255,255,255,0.22)" };
  if (value >= 32) return { base: "#868a86", edge: "rgba(20,24,20,0.38)" };
  if (value >= 8) return { base: "#c4c8c4", edge: "rgba(20,24,20,0.34)" };
  return { base: "#e0e4e0", edge: "rgba(20,24,20,0.3)" };
}

function flatTileTone(value: number): string {
  if (value >= 512) return "bg-zinc-900 text-white";
  if (value >= 128) return "bg-zinc-800 text-white";
  if (value >= 32) return "bg-[#D3DA00] text-zinc-900";
  if (value >= 8) return "bg-zinc-200 text-zinc-900";
  return "bg-white text-zinc-900";
}

function RetroPixelCell({
  value,
  className,
  children,
}: {
  value: number | null;
  className?: string;
  children?: ReactNode;
}) {
  const { base, edge } = retroCellColors(value);
  return (
    <div
      className={cn("relative h-full w-full overflow-hidden rounded-none", className)}
      style={retroPixelStyle(base, edge)}
    >
      {children ? (
        <div className="relative z-[1] flex h-full w-full items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function retroTileText(value: number): string {
  if (value >= 512) return "text-[#D3DA00]";
  if (value >= 128) return "text-white";
  return "text-zinc-900";
}

function TileFace({
  tile,
  visualStyle,
}: {
  tile: MergeTile;
  visualStyle: MergeVisualStyle;
}) {
  const rating = tile.rating.trim();
  const retro = visualStyle === "retro";
  const light = !retro && tile.value >= 128;

  return (
    <span className="flex h-full w-full flex-col items-center justify-center px-0.5 py-0.5 text-center">
      <span
        className={cn(
          "font-bold leading-none",
          retro ? "font-mono text-[17px]" : "text-[18px]",
          light ? "text-white" : "text-inherit",
        )}
      >
        {tile.value}
      </span>
      <span
        className={cn(
          "mt-0.5 max-w-full truncate font-bold leading-tight",
          retro ? "font-mono text-[8px]" : "text-[11px]",
          light ? "text-white/90" : "text-inherit opacity-90",
        )}
      >
        {tile.typeLabel}
      </span>
      {rating ? (
        <span
          className={cn(
            "max-w-full truncate leading-tight",
            retro ? "font-mono text-[7px]" : "text-[10px] font-semibold",
            light ? "text-white/70" : "opacity-70",
          )}
        >
          {rating}
        </span>
      ) : null}
    </span>
  );
}

export function MergeStyleToggle({
  value,
  onChange,
}: {
  value: MergeVisualStyle;
  onChange: (style: MergeVisualStyle) => void;
}) {
  return (
    <div className="mb-3 flex rounded-full border border-black/8 bg-zinc-100 p-1">
      {(
        [
          { id: "retro" as const, label: "Ретро" },
          { id: "flat" as const, label: "Flat" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 rounded-full px-3 py-2 ty-label transition",
            value === item.id
              ? "bg-zinc-900 text-[#D3DA00]"
              : "text-zinc-600",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Panel2048Board({
  state,
  visualStyle,
  onSwipe,
}: {
  state: MergeState;
  visualStyle: MergeVisualStyle;
  onSwipe: (dir: SwipeDir) => void;
}) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const retro = visualStyle === "retro";
  const gridStyle = {
    gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${state.size}, minmax(0, 1fr))`,
  };

  return (
    <div
      className={cn(
        "relative aspect-square w-full touch-none overflow-hidden p-1.5",
        retro
          ? "rounded-none border-4 border-zinc-800 shadow-[inset_0_0_0_3px_#7a7e7a,0_8px_0_0_#52525b]"
          : "rounded-[24px] bg-zinc-300/70",
      )}
      style={
        retro
          ? retroPixelStyle("#959995", "rgba(20,24,20,0.38)")
          : undefined
      }
      onPointerDown={(event) => {
        pointer.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointer.current;
        pointer.current = null;
        if (!start || state.lost) return;
        const dir = dirFromSwipe(
          event.clientX - start.x,
          event.clientY - start.y,
        );
        if (dir) onSwipe(dir);
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
    >
      <div
        className={cn("absolute inset-1.5 grid", retro ? "gap-1" : "gap-2")}
        style={gridStyle}
      >
        {state.cells.map((_, index) => (
          retro ? (
            <RetroPixelCell key={`slot-${index}`} value={null} />
          ) : (
            <div
              key={`slot-${index}`}
              className="rounded-[14px] bg-zinc-400/35"
            />
          )
        ))}
      </div>

      <div
        className={cn("absolute inset-1.5 grid", retro ? "gap-1" : "gap-2")}
        style={gridStyle}
      >
        {state.cells.map((tile, index) => {
          if (!tile) return null;
          const x = index % state.size;
          const y = Math.floor(index / state.size);
          return (
            <motion.div
              key={tile.id}
              layout="position"
              initial={{ scale: retro ? 1 : 0.72 }}
              animate={{ scale: tile.merged ? 1.04 : 1 }}
              transition={
                retro
                  ? { duration: 0.08 }
                  : { type: "spring", stiffness: 460, damping: 32 }
              }
              className="min-h-0 min-w-0"
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
            >
              {retro ? (
                <RetroPixelCell
                  value={tile.value}
                  className={retroTileText(tile.value)}
                >
                  <TileFace tile={tile} visualStyle={visualStyle} />
                </RetroPixelCell>
              ) : (
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center overflow-hidden border-2",
                    "rounded-[14px] border-transparent shadow-[0_4px_12px_rgba(17,17,19,0.08)]",
                    flatTileTone(tile.value),
                  )}
                >
                  <TileFace tile={tile} visualStyle={visualStyle} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
