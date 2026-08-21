import type { Device, DeviceType } from "@/types";

export const SNAKE_COLS = 14;
export const SNAKE_ROWS = 14;
export const SNAKE_TICK_MS = 140;
export const SNAKE_STORAGE_KEY = "elektropasport:panel-snake";

export type SnakeDir = "up" | "down" | "left" | "right";

export type SnakeCell = { x: number; y: number };

export type SnakeTarget = {
  /** Stable id for progress UI (device id) */
  deviceId: number;
  type: DeviceType;
  name: string;
  rating: string;
  cell: SnakeCell;
};

export type SnakeGameState = {
  snake: SnakeCell[];
  dir: SnakeDir;
  pendingDir: SnakeDir | null;
  targets: SnakeTarget[];
  collectedIds: number[];
  /** Device ids still waiting to appear on the board */
  queue: number[];
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

/** How many targets to keep on the board at once. */
function spawnBudget(totalDevices: number): number {
  const capacity = Math.floor((SNAKE_COLS * SNAKE_ROWS) / 5);
  return Math.min(Math.max(3, Math.ceil(totalDevices / 2)), capacity, totalDevices);
}

export function createSnakeGame(devices: Device[]): SnakeGameState {
  const ordered = queueDevices(devices);
  const start: SnakeCell = {
    x: Math.floor(SNAKE_COLS / 2),
    y: Math.floor(SNAKE_ROWS / 2),
  };
  const snake: SnakeCell[] = [
    start,
    { x: start.x - 1, y: start.y },
    { x: start.x - 2, y: start.y },
  ];
  const queueIds = ordered.map((device) => device.id);
  const budget = spawnBudget(ordered.length);
  const targets: SnakeTarget[] = [];
  const occupied = occupiedSet(snake, targets);

  while (targets.length < budget && queueIds.length > 0) {
    const id = queueIds.shift()!;
    const device = ordered.find((item) => item.id === id);
    if (!device) continue;
    const cell = randomEmptyCell(occupied);
    if (!cell) {
      queueIds.unshift(id);
      break;
    }
    occupied.add(cellKey(cell));
    targets.push({
      deviceId: device.id,
      type: device.type,
      name: device.name,
      rating: device.rating,
      cell,
    });
  }

  return {
    snake,
    dir: "right",
    pendingDir: null,
    targets,
    collectedIds: [],
    queue: queueIds,
    alive: true,
    won: false,
    tick: 0,
  };
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

function spawnNextTarget(
  state: SnakeGameState,
  devicesById: Map<number, Device>,
): SnakeGameState {
  if (state.queue.length === 0) return state;
  const occupied = occupiedSet(state.snake, state.targets);
  const cell = randomEmptyCell(occupied);
  if (!cell) return state;
  const id = state.queue[0]!;
  const device = devicesById.get(id);
  if (!device) {
    return { ...state, queue: state.queue.slice(1) };
  }
  return {
    ...state,
    queue: state.queue.slice(1),
    targets: [
      ...state.targets,
      {
        deviceId: device.id,
        type: device.type,
        name: device.name,
        rating: device.rating,
        cell,
      },
    ],
  };
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
  let collectedIds = state.collectedIds;
  let queue = state.queue;

  if (growing) {
    const eaten = targets[targetIndex]!;
    targets = targets.filter((_, index) => index !== targetIndex);
    collectedIds = [...collectedIds, eaten.deviceId];
  }

  let next: SnakeGameState = {
    ...state,
    snake: nextSnake,
    dir,
    pendingDir: null,
    targets,
    collectedIds,
    queue,
    tick: state.tick + 1,
  };

  const total = devices.length;
  if (collectedIds.length >= total && total > 0) {
    return { ...next, won: true, alive: true };
  }

  const devicesById = new Map(devices.map((device) => [device.id, device]));
  const budget = spawnBudget(total);
  while (next.targets.length < budget && next.queue.length > 0) {
    const spawned = spawnNextTarget(next, devicesById);
    if (spawned.targets.length === next.targets.length) break;
    next = spawned;
  }

  return next;
}

export function snakeProgress(state: SnakeGameState, total: number): {
  collected: number;
  total: number;
} {
  return { collected: state.collectedIds.length, total };
}
