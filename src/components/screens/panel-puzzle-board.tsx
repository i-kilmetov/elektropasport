"use client";

import { cn } from "@/lib/utils";
import {
  canRemovePuzzleTile,
  isModulePlaced,
  puzzleTileLabel,
  slideTargets,
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
      <span className="max-w-full truncate text-[10px] font-bold leading-tight text-zinc-900">
        {tile.typeLabel}
      </span>
      {rating ? (
        <span className="max-w-full truncate text-[9px] font-semibold leading-tight text-zinc-700">
          {rating}
        </span>
      ) : null}
      <span className="text-[9px] font-medium leading-tight text-zinc-500">
        {tile.moduleIndex + 1}/{tile.moduleCount}
      </span>
    </span>
  );
}

export function PanelPuzzleBoard({
  state,
  pickingHole,
  onTileClick,
}: {
  state: PuzzleState;
  pickingHole: boolean;
  onTileClick: (index: number) => void;
}) {
  const movable = pickingHole ? null : slideTargets(state.cells, state.size);
  const cellMin = state.size > 6 ? MIN_CELL_PX : undefined;

  return (
    <div className="max-h-[min(62dvh,560px)] overflow-auto rounded-[24px] bg-zinc-300/70 p-1.5">
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))`,
          minWidth: cellMin ? state.size * cellMin : undefined,
        }}
      >
        {state.cells.map((tile, index) => {
          const placed = isModulePlaced(tile, index);
          const canSlide = movable?.has(index) ?? false;
          const canRemove = pickingHole && canRemovePuzzleTile(state, index);
          const hole = tile == null;

          return (
            <button
              key={tile?.id ?? `hole-${index}`}
              type="button"
              disabled={state.won || hole || (!canSlide && !canRemove)}
              onClick={() => onTileClick(index)}
              aria-label={
                hole
                  ? "Пустая ячейка"
                  : tile.kind === "filler"
                    ? canRemove
                      ? "Пустая плитка — убрать"
                      : "Пустая плитка"
                    : puzzleTileLabel(tile)
              }
              className={cn(
                "relative aspect-square overflow-hidden rounded-[8px] transition",
                hole
                  ? "bg-zinc-400/35"
                  : placed
                    ? "bg-[#D3DA00] shadow-[inset_0_0_0_1px_rgba(17,17,19,0.08)]"
                    : tile.kind === "module"
                      ? "bg-white"
                      : "bg-zinc-100",
                canSlide && "ring-2 ring-zinc-900/20",
                canRemove && "ring-2 ring-zinc-900",
                !hole && !state.won && (canSlide || canRemove)
                  ? "active:scale-[0.96]"
                  : "",
              )}
            >
              {tile ? (
                <TileFace tile={tile} pickingHole={pickingHole} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
