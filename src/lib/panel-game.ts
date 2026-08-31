import type { Device, DeviceType, PanelObject } from "@/types";
import { deviceModules, groupDevicesByRail } from "@/lib/panel-rails";

export const SNAKE_COLS = 14;
export const SNAKE_ROWS = 14;
export const SNAKE_TICK_MS = 140;
export const SNAKE_STORAGE_KEY = "elektropasport:panel-snake";
export const SNAKE_CONTINUES_KEY = "elektropasport:panel-snake-continues";

export type SnakeDir = "up" | "down" | "left" | "right";

export type SnakeCell = { x: number; y: number };

export type SnakeTarget = {
  deviceId: number;
  moduleIndex: number;
  type: DeviceType;
  name: string;
  rating: string;
  cell: SnakeCell;
};

export type SnakeCollected = {
  deviceId: number;
  moduleIndex: number;
};

export type SnakeQueueItem = {
  deviceId: number;
  moduleIndex: number;
};

export type SnakeGameState = {
  snake: SnakeCell[];
  dir: SnakeDir;
  pendingDir: SnakeDir | null;
  targets: SnakeTarget[];
  collected: SnakeCollected[];
  queue: SnakeQueueItem[];
  alive: boolean;
  won: boolean;
  tick: number;
};

export const DEVICE_SHORT: Record<DeviceType, string> = {
  main_breaker: "Ввод",
  rcd: "УЗО",
  diff_breaker: "Диф",
  voltage_relay: "РН",
  breaker: "Авт",
  spd: "УЗИП",
  afdd: "ДПН",
  pe_bus: "PE",
  n_bus: "N",
};

export function deviceShortLabel(device: Device): string {
  const short = DEVICE_SHORT[device.type] ?? "Приб";
  const rating = device.rating?.trim();
  if (!rating) return short;
  return rating.length <= 6 ? `${short} ${rating}` : short;
}

export type SwipeDir = "up" | "down" | "left" | "right";

export function dirFromSwipe(
  dx: number,
  dy: number,
  min = 28,
): SwipeDir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export type PanelModuleSpec = {
  deviceId: number;
  moduleIndex: number;
  moduleCount: number;
  typeLabel: string;
  rating: string;
  order: number;
};

export function listPanelModules(
  devices: Device[],
  railCount?: number,
): PanelModuleSpec[] {
  const rails = groupDevicesByRail(devices, railCount);
  const specs: PanelModuleSpec[] = [];
  let order = 1;
  for (const rail of rails) {
    for (const device of rail) {
      const count = deviceModules(device);
      const typeLabel = DEVICE_SHORT[device.type] ?? "Приб";
      const rating = device.rating?.trim() ?? "";
      for (let moduleIndex = 0; moduleIndex < count; moduleIndex += 1) {
        specs.push({
          deviceId: device.id,
          moduleIndex,
          moduleCount: count,
          typeLabel,
          rating,
          order,
        });
        order += 1;
      }
    }
  }
  return specs;
}

export function moduleTotal(devices: Device[]): number {
  return devices.reduce((sum, device) => sum + deviceModules(device), 0);
}

/** Rail devices in scheme order (no PE/N bus bars). */
export function playDevices(panel: PanelObject): Device[] {
  if (!Array.isArray(panel.devices)) return [];
  return groupDevicesByRail(panel.devices, panel.railCount).flat();
}

export function collectedDeviceIds(
  collected: SnakeCollected[],
  devices: Device[],
): Set<number> {
  const byDevice = new Map<number, Set<number>>();
  for (const item of collected) {
    const set = byDevice.get(item.deviceId) ?? new Set<number>();
    set.add(item.moduleIndex);
    byDevice.set(item.deviceId, set);
  }
  const ids = new Set<number>();
  for (const device of devices) {
    const have = byDevice.get(device.id);
    if (have && have.size >= deviceModules(device)) ids.add(device.id);
  }
  return ids;
}

export function readSnakeContinuesUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(SNAKE_CONTINUES_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeSnakeContinuesUsed(count: number): void {
  try {
    localStorage.setItem(SNAKE_CONTINUES_KEY, String(Math.max(0, count)));
  } catch {
    // private mode
  }
}

export function snakeContinuesAvailable(
  creditedInvites: number,
  used: number,
): number {
  return Math.max(0, creditedInvites - used);
}

function cellKey(cell: SnakeCell): string {
  return `${cell.x},${cell.y}`;
}

function occupiedSet(
  snake: SnakeCell[],
  targets: SnakeTarget[],
): Set<string> {
  const set = new Set<string>();
  for (const part of snake) set.add(cellKey(part));
  for (const target of targets) set.add(cellKey(target.cell));
  return set;
}

function randomEmptyCell(
  occupied: Set<string>,
  rnd: () => number = Math.random,
): SnakeCell | null {
  const free: SnakeCell[] = [];
  for (let y = 0; y < SNAKE_ROWS; y += 1) {
    for (let x = 0; x < SNAKE_COLS; x += 1) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(rnd() * free.length)]!;
}

function randomEmptyRun(
  occupied: Set<string>,
  length: number,
  rnd: () => number = Math.random,
): SnakeCell[] | null {
  if (length <= 1) {
    const cell = randomEmptyCell(occupied, rnd);
    return cell ? [cell] : null;
  }

  const runs: SnakeCell[][] = [];
  for (let y = 0; y < SNAKE_ROWS; y += 1) {
    for (let x = 0; x <= SNAKE_COLS - length; x += 1) {
      const cells: SnakeCell[] = [];
      let ok = true;
      for (let i = 0; i < length; i += 1) {
        if (occupied.has(`${x + i},${y}`)) {
          ok = false;
          break;
        }
        cells.push({ x: x + i, y });
      }
      if (ok) runs.push(cells);
    }
  }
  for (let x = 0; x < SNAKE_COLS; x += 1) {
    for (let y = 0; y <= SNAKE_ROWS - length; y += 1) {
      const cells: SnakeCell[] = [];
      let ok = true;
      for (let i = 0; i < length; i += 1) {
        if (occupied.has(`${x},${y + i}`)) {
          ok = false;
          break;
        }
        cells.push({ x, y: y + i });
      }
      if (ok) runs.push(cells);
    }
  }
  if (runs.length === 0) return null;
  return runs[Math.floor(rnd() * runs.length)]!;
}

function placeModuleCells(
  occupied: Set<string>,
  length: number,
): SnakeCell[] | null {
  const run = randomEmptyRun(occupied, length);
  if (run) return run;
  const cells: SnakeCell[] = [];
  const nextOccupied = new Set(occupied);
  for (let i = 0; i < length; i += 1) {
    const cell = randomEmptyCell(nextOccupied);
    if (!cell) return cells.length > 0 ? cells : null;
    nextOccupied.add(cellKey(cell));
    cells.push(cell);
  }
  return cells;
}

function opposite(a: SnakeDir, b: SnakeDir): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

export function queueDevices(devices: Device[]): Device[] {
  return devices
    .slice()
    .sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id));
}

function moduleQueue(devices: Device[]): SnakeQueueItem[] {
  const queue: SnakeQueueItem[] = [];
  for (const device of queueDevices(devices)) {
    const n = deviceModules(device);
    for (let i = 0; i < n; i += 1) {
      queue.push({ deviceId: device.id, moduleIndex: i });
    }
  }
  return queue;
}

function nextDeviceSpan(queue: SnakeQueueItem[]): number {
  const first = queue[0];
  if (!first) return 0;
  let n = 1;
  while (n < queue.length && queue[n]?.deviceId === first.deviceId) {
    n += 1;
  }
  return n;
}

function spawnBudget(totalCells: number): number {
  const capacity = Math.floor((SNAKE_COLS * SNAKE_ROWS) / 6);
  return Math.min(
    Math.max(6, Math.ceil(totalCells / 2)),
    capacity,
    totalCells,
  );
}

function targetFromDevice(
  device: Device,
  moduleIndex: number,
  cell: SnakeCell,
): SnakeTarget {
  return {
    deviceId: device.id,
    moduleIndex,
    type: device.type,
    name: device.name,
    rating: device.rating,
    cell,
  };
}

function spawnNextDevice(
  state: SnakeGameState,
  devicesById: Map<number, Device>,
): SnakeGameState {
  if (state.queue.length === 0) return state;
  const span = nextDeviceSpan(state.queue);
  const first = state.queue[0]!;
  const device = devicesById.get(first.deviceId);
  if (!device) {
    return { ...state, queue: state.queue.slice(span) };
  }

  const occupied = occupiedSet(state.snake, state.targets);
  const cells = placeModuleCells(occupied, span);
  if (!cells || cells.length === 0) return state;

  const placed = cells.length;
  const nextTargets = [...state.targets];
  for (let i = 0; i < placed; i += 1) {
    const token = state.queue[i]!;
    nextTargets.push(targetFromDevice(device, token.moduleIndex, cells[i]!));
  }

  return {
    ...state,
    queue: state.queue.slice(placed),
    targets: nextTargets,
  };
}

export function createSnakeGame(devices: Device[]): SnakeGameState {
  const start: SnakeCell = {
    x: Math.floor(SNAKE_COLS / 2),
    y: Math.floor(SNAKE_ROWS / 2),
  };
  const snake: SnakeCell[] = [
    start,
    { x: start.x - 1, y: start.y },
    { x: start.x - 2, y: start.y },
  ];
  const queue = moduleQueue(devices);
  const budget = spawnBudget(queue.length);
  const devicesById = new Map(devices.map((device) => [device.id, device]));

  let state: SnakeGameState = {
    snake,
    dir: "right",
    pendingDir: null,
    targets: [],
    collected: [],
    queue,
    alive: true,
    won: false,
    tick: 0,
  };

  while (state.queue.length > 0 && state.targets.length < budget) {
    const spawned = spawnNextDevice(state, devicesById);
    if (spawned.targets.length === state.targets.length) break;
    state = spawned;
  }

  return state;
}

export function setSnakeDirection(
  state: SnakeGameState,
  next: SnakeDir,
): SnakeGameState {
  if (!state.alive || state.won) return state;
  const current = state.pendingDir ?? state.dir;
  if (opposite(current, next)) return state;
  return { ...state, pendingDir: next };
}

export function continueSnakeGame(state: SnakeGameState): SnakeGameState {
  if (state.alive || state.won) return state;
  return { ...state, alive: true, pendingDir: null };
}

export function stepSnakeGame(
  state: SnakeGameState,
  devices: Device[],
): SnakeGameState {
  if (!state.alive || state.won) return state;

  const dir = state.pendingDir ?? state.dir;
  const head = state.snake[0]!;
  const nextHead: SnakeCell = {
    x: head.x + (dir === "left" ? -1 : dir === "right" ? 1 : 0),
    y: head.y + (dir === "up" ? -1 : dir === "down" ? 1 : 0),
  };

  if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= SNAKE_COLS ||
    nextHead.y >= SNAKE_ROWS
  ) {
    return { ...state, dir, pendingDir: null, alive: false };
  }

  const hitSelf = state.snake.some(
    (part, index) =>
      index < state.snake.length - 1 &&
      part.x === nextHead.x &&
      part.y === nextHead.y,
  );
  if (hitSelf) {
    return { ...state, dir, pendingDir: null, alive: false };
  }

  const targetIndex = state.targets.findIndex(
    (target) => target.cell.x === nextHead.x && target.cell.y === nextHead.y,
  );
  const growing = targetIndex >= 0;
  const nextSnake = [nextHead, ...state.snake];
  if (!growing) nextSnake.pop();

  let targets = state.targets;
  let collected = state.collected;

  if (growing) {
    const eaten = targets[targetIndex]!;
    targets = targets.filter((_, index) => index !== targetIndex);
    collected = [
      ...collected,
      { deviceId: eaten.deviceId, moduleIndex: eaten.moduleIndex },
    ];
  }

  let next: SnakeGameState = {
    ...state,
    snake: nextSnake,
    dir,
    pendingDir: null,
    targets,
    collected,
    tick: state.tick + 1,
  };

  const total = moduleTotal(devices);
  if (collected.length >= total && total > 0) {
    return { ...next, won: true, alive: true };
  }

  const devicesById = new Map(devices.map((device) => [device.id, device]));
  const budget = spawnBudget(total);
  while (next.targets.length < budget && next.queue.length > 0) {
    const spawned = spawnNextDevice(next, devicesById);
    if (spawned.targets.length === next.targets.length) break;
    next = spawned;
  }

  return next;
}

export function snakeProgress(
  state: SnakeGameState,
  devices: Device[],
): {
  collected: number;
  total: number;
} {
  return { collected: state.collected.length, total: moduleTotal(devices) };
}
