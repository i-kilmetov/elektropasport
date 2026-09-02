import type { Device } from "@/types";
import {
  listPanelModules,
  type PanelModuleSpec,
} from "@/lib/panel-game";

export const MERGE_SIZE = 4;
export const MERGE_WIN = 2048;

export type MergeVisualStyle = "retro" | "flat";

export type MergeTile = {
  id: string;
  value: number;
  deviceId: number;
  typeLabel: string;
  rating: string;
  order: number;
  merged?: boolean;
};

export type MergeState = {
  size: number;
  cells: Array<MergeTile | null>;
  score: number;
  won: boolean;
  lost: boolean;
  moves: number;
  seq: number;
};

export type MergeSpawnSpec = {
  deviceId: number;
  typeLabel: string;
  rating: string;
  order: number;
};

const ELECTRICAL_TIERS: Array<{ value: number; typeLabel: string; rating: string }> = [
  { value: 2, typeLabel: "Розетка", rating: "220 В" },
  { value: 4, typeLabel: "Автомат", rating: "16 А" },
  { value: 8, typeLabel: "УЗО", rating: "30 mA" },
  { value: 16, typeLabel: "Диф", rating: "20 А" },
  { value: 32, typeLabel: "УЗИП", rating: "класс III" },
  { value: 64, typeLabel: "РН", rating: "170–265 В" },
  { value: 128, typeLabel: "PE", rating: "заземление" },
  { value: 256, typeLabel: "Ввод", rating: "63 А" },
  { value: 512, typeLabel: "Щиток", rating: "сборка" },
  { value: 1024, typeLabel: "Схема", rating: "готова" },
  { value: 2048, typeLabel: "Мастер", rating: "уровень" },
];

const ELECTRICAL_SPAWN: MergeSpawnSpec[] = [
  { deviceId: 1, typeLabel: "Розетка", rating: "220 В", order: 1 },
  { deviceId: 2, typeLabel: "Автомат", rating: "10 А", order: 2 },
  { deviceId: 3, typeLabel: "УЗО", rating: "30 mA", order: 3 },
  { deviceId: 4, typeLabel: "Свет", rating: "LED", order: 4 },
  { deviceId: 5, typeLabel: "Кабель", rating: "2.5 мм²", order: 5 },
  { deviceId: 6, typeLabel: "УЗИП", rating: "класс III", order: 6 },
  { deviceId: 7, typeLabel: "РН", rating: "защита", order: 7 },
  { deviceId: 8, typeLabel: "PE", rating: "заземл.", order: 8 },
];

export function mergeLabelForValue(value: number): Pick<MergeTile, "typeLabel" | "rating"> {
  let pick = ELECTRICAL_TIERS[0]!;
  for (const tier of ELECTRICAL_TIERS) {
    if (value >= tier.value) pick = tier;
  }
  return { typeLabel: pick.typeLabel, rating: pick.rating };
}

function emptyBoard(size: number): Array<MergeTile | null> {
  return Array.from({ length: size * size }, () => null);
}

function emptyIndices(cells: Array<MergeTile | null>): number[] {
  const next: number[] = [];
  for (let i = 0; i < cells.length; i += 1) {
    if (cells[i] == null) next.push(i);
  }
  return next;
}

function pickSpec(
  specs: MergeSpawnSpec[],
  rnd: () => number,
): MergeSpawnSpec | null {
  if (specs.length === 0) return null;
  return specs[Math.floor(rnd() * specs.length)] ?? null;
}

function panelSpecs(devices: Device[], railCount?: number): MergeSpawnSpec[] {
  return listPanelModules(devices, railCount).map((spec) => ({
    deviceId: spec.deviceId,
    typeLabel: spec.typeLabel,
    rating: spec.rating,
    order: spec.order,
  }));
}

function buildMergeGame(
  specs: MergeSpawnSpec[],
  rnd: () => number = Math.random,
): MergeState {
  const size = MERGE_SIZE;
  let cells = emptyBoard(size);
  let seq = 1;
  const first = spawnTileFromSpecs(cells, specs, seq, rnd);
  cells = first.cells;
  seq = first.seq;
  const second = spawnTileFromSpecs(cells, specs, seq, rnd);
  cells = second.cells;
  seq = second.seq;
  return {
    size,
    cells,
    score: 0,
    won: false,
    lost: false,
    moves: 0,
    seq,
  };
}

function stepMergeGame(
  state: MergeState,
  dir: "up" | "down" | "left" | "right",
  specs: MergeSpawnSpec[],
  rnd: () => number = Math.random,
): MergeState {
  if (state.lost) return state;

  const size = state.size;
  const cells = state.cells.slice();
  let score = state.score;
  let moved = false;

  for (let i = 0; i < size; i += 1) {
    const line = readLine(cells, size, dir, i);
    const result = slideLine(line);
    if (result.moved) moved = true;
    score += result.score;
    writeLine(cells, size, dir, i, result.line);
  }

  if (!moved) return state;

  const spawned = spawnTileFromSpecs(cells, specs, state.seq, rnd);
  const won = spawned.cells.some((tile) => (tile?.value ?? 0) >= MERGE_WIN);
  const lost = !won && !hasMove(spawned.cells, size);

  return {
    ...state,
    cells: spawned.cells,
    seq: spawned.seq,
    score,
    moves: state.moves + 1,
    won: state.won || won,
    lost,
  };
}

function spawnTileFromSpecs(
  cells: Array<MergeTile | null>,
  specs: MergeSpawnSpec[],
  seq: number,
  rnd: () => number,
): { cells: Array<MergeTile | null>; seq: number } {
  const slots = emptyIndices(cells);
  if (slots.length === 0) return { cells, seq };
  const spec = pickSpec(specs, rnd);
  if (!spec) return { cells, seq };
  const value = rnd() < 0.9 ? 2 : 4;
  const labels = mergeLabelForValue(value);
  const index = slots[Math.floor(rnd() * slots.length)]!;
  const next = cells.slice();
  next[index] = {
    id: `t-${seq}`,
    value,
    deviceId: spec.deviceId,
    typeLabel: labels.typeLabel,
    rating: labels.rating,
    order: spec.order,
  };
  return { cells: next, seq: seq + 1 };
}

function spawnTile(
  cells: Array<MergeTile | null>,
  specs: MergeSpawnSpec[],
  seq: number,
  rnd: () => number,
): { cells: Array<MergeTile | null>; seq: number } {
  return spawnTileFromSpecs(cells, specs, seq, rnd);
}

function slideLine(line: Array<MergeTile | null>): {
  line: Array<MergeTile | null>;
  score: number;
  moved: boolean;
} {
  const tiles = line.filter((tile): tile is MergeTile => tile != null);
  const merged: MergeTile[] = [];
  let score = 0;
  let i = 0;
  while (i < tiles.length) {
    const a = tiles[i]!;
    const b = tiles[i + 1];
    if (b && a.value === b.value) {
      const value = a.value * 2;
      const labels = mergeLabelForValue(value);
      merged.push({
        ...a,
        value,
        typeLabel: labels.typeLabel,
        rating: labels.rating,
        merged: true,
      });
      score += a.value * 2;
      i += 2;
    } else {
      merged.push({ ...a, merged: false });
      i += 1;
    }
  }
  const next: Array<MergeTile | null> = [
    ...merged,
    ...Array.from({ length: line.length - merged.length }, () => null),
  ];
  const moved = next.some((tile, index) => {
    const prev = line[index];
    if (tile == null && prev == null) return false;
    if (tile == null || prev == null) return true;
    return tile.id !== prev.id || tile.value !== prev.value;
  });
  return { line: next, score, moved };
}

function readLine(
  cells: Array<MergeTile | null>,
  size: number,
  dir: "up" | "down" | "left" | "right",
  index: number,
): Array<MergeTile | null> {
  const line: Array<MergeTile | null> = [];
  for (let i = 0; i < size; i += 1) {
    if (dir === "left") line.push(cells[index * size + i] ?? null);
    else if (dir === "right") line.push(cells[index * size + (size - 1 - i)] ?? null);
    else if (dir === "up") line.push(cells[i * size + index] ?? null);
    else line.push(cells[(size - 1 - i) * size + index] ?? null);
  }
  return line;
}

function writeLine(
  cells: Array<MergeTile | null>,
  size: number,
  dir: "up" | "down" | "left" | "right",
  index: number,
  line: Array<MergeTile | null>,
): void {
  for (let i = 0; i < size; i += 1) {
    const tile = line[i] ?? null;
    if (dir === "left") cells[index * size + i] = tile;
    else if (dir === "right") cells[index * size + (size - 1 - i)] = tile;
    else if (dir === "up") cells[i * size + index] = tile;
    else cells[(size - 1 - i) * size + index] = tile;
  }
}

function hasMove(cells: Array<MergeTile | null>, size: number): boolean {
  if (emptyIndices(cells).length > 0) return true;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tile = cells[y * size + x];
      if (!tile) continue;
      if (x + 1 < size && cells[y * size + x + 1]?.value === tile.value) {
        return true;
      }
      if (y + 1 < size && cells[(y + 1) * size + x]?.value === tile.value) {
        return true;
      }
    }
  }
  return false;
}

export function mergeDeviceIds(state: MergeState): Set<number> {
  const ids = new Set<number>();
  for (const tile of state.cells) {
    if (tile) ids.add(tile.deviceId);
  }
  return ids;
}

export function createElectrical2048Game(
  rnd: () => number = Math.random,
): MergeState {
  return buildMergeGame(ELECTRICAL_SPAWN, rnd);
}

export function moveElectrical2048Game(
  state: MergeState,
  dir: "up" | "down" | "left" | "right",
  rnd: () => number = Math.random,
): MergeState {
  return stepMergeGame(state, dir, ELECTRICAL_SPAWN, rnd);
}

export function createMergeGame(
  devices: Device[],
  railCount?: number,
  rnd: () => number = Math.random,
): MergeState {
  return buildMergeGame(panelSpecs(devices, railCount), rnd);
}

export function moveMergeGame(
  state: MergeState,
  dir: "up" | "down" | "left" | "right",
  devices: Device[],
  railCount?: number,
  rnd: () => number = Math.random,
): MergeState {
  return stepMergeGame(state, dir, panelSpecs(devices, railCount), rnd);
}
