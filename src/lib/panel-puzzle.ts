import type { Device } from "@/types";
import { DEVICE_SHORT } from "@/lib/panel-game";
import {
  deviceModules,
  groupDevicesByRail,
  railModuleTotal,
} from "@/lib/panel-rails";

export const PUZZLE_MIN_SIZE = 5;
export const PUZZLE_SHUFFLE_MOVES = 480;

export type PuzzleModuleTile = {
  id: string;
  kind: "module";
  deviceId: number;
  moduleIndex: number;
  moduleCount: number;
  typeLabel: string;
  rating: string;
  targetIndex: number;
};

export type PuzzleFillerTile = {
  id: string;
  kind: "filler";
};

export type PuzzleTile = PuzzleModuleTile | PuzzleFillerTile;

export type PuzzleState = {
  size: number;
  cells: Array<PuzzleTile | null>;
  extraHoleUsed: boolean;
  won: boolean;
  moves: number;
};

const DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

export function puzzleBoardSize(rails: Device[][]): number {
  const longest = rails.reduce(
    (max, rail) => Math.max(max, railModuleTotal(rail)),
    0,
  );
  return Math.max(PUZZLE_MIN_SIZE, longest);
}

export function cellIndex(x: number, y: number, size: number): number {
  return y * size + x;
}

export function cellXY(
  index: number,
  size: number,
): { x: number; y: number } {
  return { x: index % size, y: Math.floor(index / size) };
}

export function puzzleTileLabel(tile: PuzzleModuleTile): string {
  const part = `${tile.moduleIndex + 1}/${tile.moduleCount}`;
  const rating = tile.rating.trim();
  return rating
    ? `${tile.typeLabel} ${rating} · ${part}`
    : `${tile.typeLabel} · ${part}`;
}

export function holeIndices(cells: Array<PuzzleTile | null>): number[] {
  const holes: number[] = [];
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] == null) holes.push(i);
  }
  return holes;
}

function inBounds(x: number, y: number, size: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size;
}

export function adjacentIndices(index: number, size: number): number[] {
  const { x, y } = cellXY(index, size);
  const next: number[] = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny, size)) next.push(cellIndex(nx, ny, size));
  }
  return next;
}

export function slideTargets(
  cells: Array<PuzzleTile | null>,
  size: number,
): Set<number> {
  const targets = new Set<number>();
  for (const hole of holeIndices(cells)) {
    for (const neighbor of adjacentIndices(hole, size)) {
      if (cells[neighbor] != null) targets.add(neighbor);
    }
  }
  return targets;
}

export function isModulePlaced(
  tile: PuzzleTile | null,
  index: number,
): boolean {
  return tile?.kind === "module" && tile.targetIndex === index;
}

export function placedModuleCount(state: PuzzleState): number {
  return state.cells.reduce(
    (sum, tile, index) => (isModulePlaced(tile, index) ? sum + 1 : sum),
    0,
  );
}

export function puzzleModuleTotal(state: PuzzleState): number {
  return state.cells.reduce(
    (sum, tile) => (tile?.kind === "module" ? sum + 1 : sum),
    0,
  );
}

export function placedDeviceIds(
  state: PuzzleState,
  devices: Device[],
): Set<number> {
  const byDevice = new Map<number, { have: number; need: number }>();
  for (const device of devices) {
    byDevice.set(device.id, { have: 0, need: deviceModules(device) });
  }
  state.cells.forEach((tile, index) => {
    if (tile?.kind !== "module" || tile.targetIndex !== index) return;
    const rec = byDevice.get(tile.deviceId);
    if (rec) rec.have += 1;
  });
  const ids = new Set<number>();
  for (const [id, rec] of byDevice) {
    if (rec.have >= rec.need && rec.need > 0) ids.add(id);
  }
  return ids;
}

export function isPuzzleSolved(cells: Array<PuzzleTile | null>): boolean {
  for (let i = 0; i < cells.length; i += 1) {
    const tile = cells[i];
    if (tile?.kind === "module" && tile.targetIndex !== i) return false;
  }
  return cells.some((tile) => tile?.kind === "module");
}

function swapCells(
  cells: Array<PuzzleTile | null>,
  a: number,
  b: number,
): Array<PuzzleTile | null> {
  const next = cells.slice();
  const tmp = next[a] ?? null;
  next[a] = next[b] ?? null;
  next[b] = tmp;
  return next;
}

export function slidePuzzleTile(
  state: PuzzleState,
  tileIndex: number,
): PuzzleState {
  if (state.won) return state;
  const tile = state.cells[tileIndex];
  if (!tile) return state;

  const hole = adjacentIndices(tileIndex, state.size).find(
    (index) => state.cells[index] == null,
  );
  if (hole == null) return state;

  const cells = swapCells(state.cells, tileIndex, hole);
  return {
    ...state,
    cells,
    moves: state.moves + 1,
    won: isPuzzleSolved(cells),
  };
}

export function slidePuzzleHole(
  state: PuzzleState,
  dir: "up" | "down" | "left" | "right",
): PuzzleState {
  if (state.won) return state;
  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  for (const hole of holeIndices(state.cells)) {
    const { x, y } = cellXY(hole, state.size);
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, state.size)) continue;
    const tileIndex = cellIndex(nx, ny, state.size);
    if (state.cells[tileIndex] == null) continue;
    return slidePuzzleTile(state, tileIndex);
  }
  return state;
}

export function canRemovePuzzleTile(
  state: PuzzleState,
  tileIndex: number,
): boolean {
  if (state.won || state.extraHoleUsed) return false;
  return state.cells[tileIndex]?.kind === "filler";
}

/** Removes one filler tile so the board has a second hole. */
export function removeExtraPuzzleHole(
  state: PuzzleState,
  tileIndex: number,
): PuzzleState {
  if (!canRemovePuzzleTile(state, tileIndex)) return state;
  const cells = state.cells.slice();
  cells[tileIndex] = null;
  return {
    ...state,
    cells,
    extraHoleUsed: true,
    won: isPuzzleSolved(cells),
  };
}

function buildSolvedCells(rails: Device[][], size: number): Array<PuzzleTile | null> {
  const cells: Array<PuzzleTile | null> = Array.from(
    { length: size * size },
    () => null,
  );
  let fillerN = 0;

  rails.forEach((rail, railIdx) => {
    if (railIdx >= size) return;
    let x = 0;
    for (const device of rail) {
      const count = deviceModules(device);
      const typeLabel = DEVICE_SHORT[device.type] ?? "Приб";
      const rating = device.rating?.trim() ?? "";
      for (let moduleIndex = 0; moduleIndex < count; moduleIndex += 1) {
        if (x >= size) break;
        const targetIndex = cellIndex(x, railIdx, size);
        cells[targetIndex] = {
          id: `m-${device.id}-${moduleIndex}`,
          kind: "module",
          deviceId: device.id,
          moduleIndex,
          moduleCount: count,
          typeLabel,
          rating,
          targetIndex,
        };
        x += 1;
      }
    }
  });

  const last = size * size - 1;
  for (let i = 0; i < last; i += 1) {
    if (cells[i] == null) {
      cells[i] = { id: `f-${fillerN}`, kind: "filler" };
      fillerN += 1;
    }
  }
  cells[last] = null;
  return cells;
}

function shuffleCells(
  cells: Array<PuzzleTile | null>,
  size: number,
  rnd: () => number,
): Array<PuzzleTile | null> {
  let next = cells.slice();
  let lastHole = -1;
  const steps = Math.max(PUZZLE_SHUFFLE_MOVES, size * size * 12);

  for (let step = 0; step < steps; step += 1) {
    const holes = holeIndices(next);
    if (holes.length === 0) break;
    const hole = holes[Math.floor(rnd() * holes.length)]!;
    const neighbors = adjacentIndices(hole, size).filter(
      (index) => next[index] != null && index !== lastHole,
    );
    const pool = neighbors.length > 0 ? neighbors : adjacentIndices(hole, size).filter(
      (index) => next[index] != null,
    );
    if (pool.length === 0) continue;
    const pick = pool[Math.floor(rnd() * pool.length)]!;
    next = swapCells(next, hole, pick);
    lastHole = hole;
  }

  if (isPuzzleSolved(next)) {
    const holes = holeIndices(next);
    const hole = holes[0];
    if (hole != null) {
      const neighbor = adjacentIndices(hole, size).find((index) => next[index] != null);
      if (neighbor != null) next = swapCells(next, hole, neighbor);
    }
  }

  return next;
}

export function createPanelPuzzle(
  devices: Device[],
  railCount?: number,
  rnd: () => number = Math.random,
): PuzzleState {
  const rails = groupDevicesByRail(devices, railCount);
  const size = puzzleBoardSize(rails);
  const solved = buildSolvedCells(rails, size);
  const cells = shuffleCells(solved, size, rnd);
  return {
    size,
    cells,
    extraHoleUsed: false,
    won: isPuzzleSolved(cells),
    moves: 0,
  };
}
