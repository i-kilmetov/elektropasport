"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dirFromSwipe, type SwipeDir } from "@/lib/panel-game";
import type { MergeState, MergeTile } from "@/lib/panel-2048";

function tileTone(value: number): string {
  if (value >= 512) return "bg-zinc-900 text-white";
  if (value >= 128) return "bg-zinc-800 text-white";
  if (value >= 32) return "bg-[#D3DA00] text-zinc-900";
  if (value >= 8) return "bg-zinc-200 text-zinc-900";
  return "bg-white text-zinc-900";
}

function TileFace({ tile }: { tile: MergeTile }) {
  const rating = tile.rating.trim();
  const light = tile.value >= 128;
  return (
    <span className="flex h-full w-full flex-col items-center justify-center px-1 py-1 text-center">
      <span
        className={cn(
          "text-[18px] font-bold leading-none",
          light ? "text-white" : "text-zinc-900",
        )}
      >
        {tile.value}
      </span>
      <span
        className={cn(
          "mt-1 max-w-full truncate text-[11px] font-bold leading-tight",
          light ? "text-white/90" : "text-zinc-800",
        )}
      >
        №{tile.order} {tile.typeLabel}
      </span>
      {rating ? (
        <span
          className={cn(
            "max-w-full truncate text-[10px] font-semibold leading-tight",
            light ? "text-white/70" : "text-zinc-600",
          )}
        >
          {rating}
        </span>
      ) : null}
    </span>
  );
}

export function Panel2048Board({
  state,
  onSwipe,
}: {
  state: MergeState;
  onSwipe: (dir: SwipeDir) => void;
}) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const gridStyle = {
    gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${state.size}, minmax(0, 1fr))`,
  };

  return (
    <div
      className="relative aspect-square w-full touch-none overflow-hidden rounded-[24px] bg-zinc-300/70 p-1.5"
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
      <div className="absolute inset-1.5 grid gap-2" style={gridStyle}>
        {state.cells.map((_, index) => (
          <div
            key={`slot-${index}`}
            className="rounded-[14px] bg-zinc-400/35"
          />
        ))}
      </div>

      <div className="absolute inset-1.5 grid gap-2" style={gridStyle}>
        {state.cells.map((tile, index) => {
          if (!tile) return null;
          const x = index % state.size;
          const y = Math.floor(index / state.size);
          return (
            <motion.div
              key={tile.id}
              layout="position"
              initial={{ scale: 0.72 }}
              animate={{ scale: tile.merged ? 1.06 : 1 }}
              transition={{ type: "spring", stiffness: 460, damping: 32 }}
              className="min-h-0 min-w-0"
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
            >
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] shadow-[0_4px_12px_rgba(17,17,19,0.08)]",
                  tileTone(tile.value),
                )}
              >
                <TileFace tile={tile} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
