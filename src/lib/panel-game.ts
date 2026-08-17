export const PANEL_GAME_SIZE = 4;
export const PANEL_GAME_WIN = 1024;
export const PANEL_GAME_STORAGE_KEY = "elektropasport:panel-game";

export type PanelGameTile = {
  value: number;
  title: string;
  caption: string;
  fact: string;
  className: string;
};

/** Each merge is the next step from a load to a protected panel. */
export const PANEL_GAME_TILES: PanelGameTile[] = [
  {
    value: 2,
    title: "Лампа",
    caption: "0,5 А",
    fact: "Лампочка почти не грузит линию — это самая слабая нагрузка в квартире.",
    className: "bg-[#f3efe6] text-zinc-800",
  },
  {
    value: 4,
    title: "Свет",
    caption: "группа",
    fact: "Несколько светильников собирают в одну линию освещения.",
    className: "bg-amber-100 text-amber-950",
  },
  {
    value: 8,
    title: "C10",
    caption: "автомат",
    fact: "Линию света обычно защищают автоматом C6 или C10 — не ставьте сюда C32.",
    className: "bg-orange-400 text-white",
  },
  {
    value: 16,
    title: "Розетки",
    caption: "линия",
    fact: "Розеточная линия кормит чайник, зарядки и пылесос. Ей нужна своя защита.",
    className: "bg-sky-400 text-white",
  },
  {
    value: 32,
    title: "C16",
    caption: "автомат",
    fact: "Автомат C16 — типичная защита розеток. Он отключит линию при перегрузе или КЗ.",
    className: "bg-blue-600 text-white",
  },
  {
    value: 64,
    title: "Ванная",
    caption: "влажно",
    fact: "Во влажной зоне одной защиты по току мало: нужна ещё защита человека.",
    className: "bg-cyan-500 text-white",
  },
  {
    value: 128,
    title: "УЗО",
    caption: "30 мА",
    fact: "УЗО 30 мА ловит утечку на человека или мокрый пол и отключает питание за доли секунды.",
    className: "bg-teal-600 text-white",
  },
  {
    value: 256,
    title: "Диф.",
    caption: "автомат+УЗО",
    fact: "Дифавтомат — это автомат и УЗО в одном корпусе. Удобно, если мало места в щитке.",
    className: "bg-emerald-600 text-white",
  },
  {
    value: 512,
    title: "Ввод",
    caption: "C40",
    fact: "Вводной автомат стоит первым и защищает весь щиток, а не одну розетку.",
    className: "bg-violet-600 text-white",
  },
  {
    value: 1024,
    title: "Щиток",
    caption: "собран",
    fact: "Схема собрана: нагрузки → линии → автоматы → УЗО → ввод. Так устроен нормальный щиток.",
    className: "bg-zinc-900 text-white",
  },
  {
    value: 2048,
    title: "Дом",
    caption: "в сети",
    fact: "Дом подключён. Вы прошли путь от лампочки до ввода — это и есть логика щитка.",
    className: "bg-black text-amber-200",
  },
];

const TILE_BY_VALUE = new Map(PANEL_GAME_TILES.map((tile) => [tile.value, tile]));

export function panelGameTile(value: number): PanelGameTile | undefined {
  return TILE_BY_VALUE.get(value);
}

export type PanelGameState = {
  board: number[];
  score: number;
  best: number;
  won: boolean;
  continued: boolean;
};

export function emptyBoard(): number[] {
  return Array.from({ length: PANEL_GAME_SIZE * PANEL_GAME_SIZE }, () => 0);
}

function emptyIndexes(board: number[]): number[] {
  return board.flatMap((value, index) => (value === 0 ? [index] : []));
}

export function spawnTile(board: number[]): number[] {
  const spots = emptyIndexes(board);
  if (spots.length === 0) return board;
  const index = spots[Math.floor(Math.random() * spots.length)]!;
  const next = board.slice();
  next[index] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function createPanelGame(best = 0): PanelGameState {
  return {
    board: spawnTile(spawnTile(emptyBoard())),
    score: 0,
    best,
    won: false,
    continued: false,
  };
}

function slideLine(line: number[]): {
  line: number[];
  score: number;
  merged: number[];
} {
  const compact = line.filter((value) => value !== 0);
  const next: number[] = [];
  const merged: number[] = [];
  let score = 0;
  let i = 0;
  while (i < compact.length) {
    const current = compact[i]!;
    const ahead = compact[i + 1];
    if (ahead === current) {
      const value = current * 2;
      next.push(value);
      merged.push(value);
      score += value;
      i += 2;
    } else {
      next.push(current);
      i += 1;
    }
  }
  while (next.length < PANEL_GAME_SIZE) next.push(0);
  return { line: next, score, merged };
}

function rowsOf(board: number[]): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < PANEL_GAME_SIZE; y += 1) {
    rows.push(
      board.slice(y * PANEL_GAME_SIZE, y * PANEL_GAME_SIZE + PANEL_GAME_SIZE),
    );
  }
  return rows;
}

function fromRows(rows: number[][]): number[] {
  return rows.flat();
}

function colsOf(board: number[]): number[][] {
  const cols: number[][] = [];
  for (let x = 0; x < PANEL_GAME_SIZE; x += 1) {
    const col: number[] = [];
    for (let y = 0; y < PANEL_GAME_SIZE; y += 1) {
      col.push(board[y * PANEL_GAME_SIZE + x]!);
    }
    cols.push(col);
  }
  return cols;
}

function fromCols(cols: number[][]): number[] {
  const board = emptyBoard();
  for (let x = 0; x < PANEL_GAME_SIZE; x += 1) {
    for (let y = 0; y < PANEL_GAME_SIZE; y += 1) {
      board[y * PANEL_GAME_SIZE + x] = cols[x]![y]!;
    }
  }
  return board;
}

export type PanelGameDir = "left" | "right" | "up" | "down";

export function movePanelGame(
  state: PanelGameState,
  dir: PanelGameDir,
): { state: PanelGameState; moved: boolean; merged: number[] } {
  let score = 0;
  const merged: number[] = [];
  let nextBoard: number[];

  if (dir === "left" || dir === "right") {
    const rows = rowsOf(state.board).map((row) => {
      const source = dir === "left" ? row : [...row].reverse();
      const slid = slideLine(source);
      score += slid.score;
      merged.push(...slid.merged);
      return dir === "left" ? slid.line : [...slid.line].reverse();
    });
    nextBoard = fromRows(rows);
  } else {
    const cols = colsOf(state.board).map((col) => {
      const source = dir === "up" ? col : [...col].reverse();
      const slid = slideLine(source);
      score += slid.score;
      merged.push(...slid.merged);
      return dir === "up" ? slid.line : [...slid.line].reverse();
    });
    nextBoard = fromCols(cols);
  }

  const moved = nextBoard.some((value, index) => value !== state.board[index]);
  if (!moved) return { state, moved: false, merged: [] };

  const board = spawnTile(nextBoard);
  const nextScore = state.score + score;
  const reachedWin = board.some((value) => value >= PANEL_GAME_WIN);
  return {
    moved: true,
    merged,
    state: {
      board,
      score: nextScore,
      best: Math.max(state.best, nextScore),
      won: state.won || reachedWin,
      continued: state.continued,
    },
  };
}

export function canMovePanelGame(board: number[]): boolean {
  if (emptyIndexes(board).length > 0) return true;
  for (let y = 0; y < PANEL_GAME_SIZE; y += 1) {
    for (let x = 0; x < PANEL_GAME_SIZE; x += 1) {
      const value = board[y * PANEL_GAME_SIZE + x]!;
      if (x + 1 < PANEL_GAME_SIZE && board[y * PANEL_GAME_SIZE + x + 1] === value) {
        return true;
      }
      if (
        y + 1 < PANEL_GAME_SIZE &&
        board[(y + 1) * PANEL_GAME_SIZE + x] === value
      ) {
        return true;
      }
    }
  }
  return false;
}

export function readPanelGame(): PanelGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PANEL_GAME_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PanelGameState>;
    if (!Array.isArray(data.board) || data.board.length !== 16) return null;
    return {
      board: data.board.map((value) => (typeof value === "number" ? value : 0)),
      score: Number(data.score) || 0,
      best: Number(data.best) || 0,
      won: Boolean(data.won),
      continued: Boolean(data.continued),
    };
  } catch {
    return null;
  }
}

export function writePanelGame(state: PanelGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PANEL_GAME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private mode
  }
}

export function readPanelGameBest(): number {
  return readPanelGame()?.best ?? 0;
}
