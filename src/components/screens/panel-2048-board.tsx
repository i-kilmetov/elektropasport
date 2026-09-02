"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dirFromSwipe, type SwipeDir } from "@/lib/panel-game";
import type { MergeState, MergeTile, MergeVisualStyle } from "@/lib/panel-2048";

function flatTileTone(value: number): string {
  if (value >= 512) return "bg-zinc-900 text-white";
  if (value >= 128) return "bg-zinc-800 text-white";
  if (value >= 32) return "bg-[#D3DA00] text-zinc-900";
  if (value >= 8) return "bg-zinc-200 text-zinc-900";
  return "bg-white text-zinc-900";
}

function retroTileTone(value: number): string {
  if (value >= 512) return "bg-zinc-900 text-[#D3DA00]";
  if (value >= 128) return "bg-zinc-800 text-white";
  if (value >= 32) return "bg-[#8a8e8a] text-zinc-900 border-zinc-700";
  if (value >= 8) return "bg-[#c8ccc8] text-zinc-900 border-zinc-600";
  return "bg-[#e4e8e4] text-zinc-900 border-zinc-500";
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
          ? "rounded-[8px] border-4 border-zinc-800 bg-[#9a9e9a] shadow-[inset_0_0_0_3px_#7a7e7a,0_8px_0_0_#52525b] [image-rendering:pixelated]"
          : "rounded-[24px] bg-zinc-300/70",
      )}
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
          <div
            key={`slot-${index}`}
            className={cn(
              retro
                ? "border border-zinc-600/80 bg-[#7a7e7a]"
                : "rounded-[14px] bg-zinc-400/35",
            )}
          />
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
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center overflow-hidden border-2",
                  retro
                    ? cn("rounded-none shadow-none", retroTileTone(tile.value))
                    : cn(
                        "rounded-[14px] border-transparent shadow-[0_4px_12px_rgba(17,17,19,0.08)]",
                        flatTileTone(tile.value),
                      ),
                )}
              >
                <TileFace tile={tile} visualStyle={visualStyle} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
