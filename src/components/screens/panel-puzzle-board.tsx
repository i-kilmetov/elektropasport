"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dirFromSwipe } from "@/lib/panel-game";
import {
  canRemovePuzzleTile,
  cellXY,
  isModulePlaced,
  puzzleTileLabel,
  type PuzzleDir,
  type PuzzleState,
  type PuzzleTile,
} from "@/lib/panel-puzzle";

const MIN_CELL_PX = 56;

function TileFace({
  tile,
  pickingHole,
}: {
  tile: PuzzleTile;
  pickingHole: boolean;
}) {
  if (tile.kind === "filler") {
    return (
      <span
        className={cn(
          "text-[9px] font-semibold",
          pickingHole ? "text-zinc-700" : "text-zinc-300",
        )}
      >
        {pickingHole ? "убрать" : "·"}
      </span>
    );
  }

  const rating = tile.rating.trim();
  return (
    <span className="flex h-full w-full flex-col items-center justify-center px-0.5 py-0.5 text-center">
      <span className="text-[15px] font-bold leading-none text-zinc-900">
        {tile.order}
      </span>
      <span className="mt-0.5 max-w-full truncate text-[9px] font-bold leading-tight text-zinc-800">
        {tile.typeLabel}
      </span>
      {rating ? (
        <span className="max-w-full truncate text-[8px] font-semibold leading-tight text-zinc-600">
          {rating}
        </span>
      ) : null}
    </span>
  );
}

export function PanelPuzzleBoard({
  state,
  pickingHole,
  onSwipe,
  onTileClick,
}: {
  state: PuzzleState;
  pickingHole: boolean;
  onSwipe: (dir: PuzzleDir) => void;
  onTileClick: (index: number) => void;
}) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const cellMin = state.size > 6 ? MIN_CELL_PX : undefined;
  const gridStyle = {
    gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${state.size}, minmax(0, 1fr))`,
  };

  return (
    <div
      className={cn(
        "rounded-[24px] bg-zinc-300/70 p-1.5",
        state.size > 6 && "max-h-[min(62dvh,560px)] overflow-auto",
      )}
    >
      <div
        className="relative touch-none overflow-hidden rounded-[18px]"
        style={{
          minWidth: cellMin ? state.size * cellMin : undefined,
          aspectRatio: "1 / 1",
        }}
        onPointerDown={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY };
          swiped.current = false;
        }}
        onPointerUp={(event) => {
          const start = pointer.current;
          pointer.current = null;
          if (!start || pickingHole || state.won) return;
          const dir = dirFromSwipe(
            event.clientX - start.x,
            event.clientY - start.y,
          );
          if (!dir) return;
          swiped.current = true;
          onSwipe(dir);
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        <div
          className="absolute inset-0 grid gap-[3px] p-[3px]"
          style={gridStyle}
        >
          {state.cells.map((_, index) => (
            <div
              key={`slot-${index}`}
              className="rounded-[8px] bg-zinc-400/35"
            />
          ))}
        </div>

        <div
          className="absolute inset-0 grid gap-[3px] p-[3px]"
          style={gridStyle}
        >
          {state.cells.map((tile, index) => {
            if (!tile) return null;
            const { x, y } = cellXY(index, state.size);
            const placed = isModulePlaced(tile, index);
            const canRemove = pickingHole && canRemovePuzzleTile(state, index);

            return (
              <motion.button
                key={tile.id}
                type="button"
                layout="position"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
                disabled={state.won || (!pickingHole && !canRemove)}
                onClick={() => {
                  if (swiped.current) return;
                  onTileClick(index);
                }}
                aria-label={
                  tile.kind === "filler"
                    ? canRemove
                      ? "Пустая плитка — убрать"
                      : "Пустая плитка"
                    : puzzleTileLabel(tile)
                }
                className={cn(
                  "min-h-0 min-w-0",
                  !pickingHole && "pointer-events-none",
                )}
                style={{ gridColumn: x + 1, gridRow: y + 1 }}
              >
                <span
                  className={cn(
                    "flex h-full w-full items-center justify-center overflow-hidden rounded-[8px]",
                    placed
                      ? "bg-[#D3DA00] shadow-[inset_0_0_0_1px_rgba(17,17,19,0.08)]"
                      : tile.kind === "module"
                        ? "bg-white"
                        : "bg-zinc-100",
                    canRemove && "ring-2 ring-zinc-900",
                  )}
                >
                  <TileFace tile={tile} pickingHole={pickingHole} />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
