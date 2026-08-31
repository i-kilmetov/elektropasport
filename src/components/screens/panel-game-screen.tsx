"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Grid3x3, UserPlus, Zap } from "lucide-react";
import { DeviceFaceStatic, MODULE_PX } from "@/components/icons/device-face";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PanelLimitSheet } from "@/components/screens/panel-limit-sheet";
import { PanelPuzzleBoard } from "@/components/screens/panel-puzzle-board";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  collectedDeviceIds,
  continueSnakeGame,
  createSnakeGame,
  DEVICE_SHORT,
  deviceShortLabel,
  moduleTotal,
  playDevices,
  readSnakeContinuesUsed,
  setSnakeDirection,
  SNAKE_COLS,
  SNAKE_ROWS,
  SNAKE_TICK_MS,
  snakeContinuesAvailable,
  stepSnakeGame,
  writeSnakeContinuesUsed,
  type SnakeDir,
  type SnakeGameState,
} from "@/lib/panel-game";
import { deviceModules, groupDevicesByRail } from "@/lib/panel-rails";
import {
  canRemovePuzzleTile,
  createPanelPuzzle,
  placedDeviceIds,
  placedModuleCount,
  puzzleModuleTotal,
  removeExtraPuzzleHole,
  slidePuzzleHole,
  slidePuzzleTile,
  type PuzzleState,
} from "@/lib/panel-puzzle";
import { hasUnlockedPanelLimit, type PanelQuota } from "@/lib/invites";
import { cn } from "@/lib/utils";
import type { Device, PanelObject } from "@/types";

const SWIPE = 28;
const MINI_SCALE = 0.42;

type Phase = "gate" | "pick" | "ready" | "play";
type GameKind = "puzzle" | "snake";

function PanelMiniature({
  devices,
  railCount,
  collectedIds,
  className,
}: {
  devices: Device[];
  railCount?: number;
  collectedIds: Set<number>;
  className?: string;
}) {
  const rails = useMemo(
    () => groupDevicesByRail(devices, railCount),
    [devices, railCount],
  );

  if (devices.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[20px] border border-dashed border-black/12 bg-zinc-50 px-4 py-6 text-center ty-note",
          className,
        )}
      >
        В щитке пока нет приборов
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[20px] border border-black/8 bg-zinc-100/90 px-3 py-3",
        className,
      )}
    >
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${MINI_SCALE})`,
          width: `${100 / MINI_SCALE}%`,
        }}
      >
        {rails.map((railDevices, railIdx) => (
          <div
            key={railIdx}
            className={cn("flex items-end gap-1", railIdx > 0 && "mt-3")}
          >
            {railDevices.map((device) => {
              const on = collectedIds.has(device.id);
              const modules = deviceModules(device);
              return (
                <div
                  key={device.id}
                  className={cn(
                    "transition-[filter,opacity] duration-300",
                    on
                      ? "opacity-100"
                      : "opacity-45 grayscale brightness-90",
                  )}
                  style={{ width: modules * MODULE_PX }}
                >
                  <DeviceFaceStatic
                    device={device}
                    modules={modules}
                    showTerminals={false}
                    showDetails
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SnakeBoard({
  state,
  devicesById,
}: {
  state: SnakeGameState;
  devicesById: Map<number, Device>;
}) {
  const head = state.snake[0];
  const targetByCell = new Map(
    state.targets.map((target) => [
      `${target.cell.x},${target.cell.y}`,
      target,
    ]),
  );

  return (
    <div
      className="grid gap-[2px] rounded-[24px] bg-zinc-300/70 p-1.5"
      style={{
        gridTemplateColumns: `repeat(${SNAKE_COLS}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: SNAKE_ROWS * SNAKE_COLS }, (_, index) => {
        const x = index % SNAKE_COLS;
        const y = Math.floor(index / SNAKE_COLS);
        const key = `${x},${y}`;
        const isHead = head?.x === x && head?.y === y;
        const onSnake = state.snake.some(
          (cell) => cell.x === x && cell.y === y,
        );
        const target = targetByCell.get(key);
        const device = target ? devicesById.get(target.deviceId) : undefined;

        return (
          <div
            key={key}
            className={cn(
              "relative aspect-square overflow-hidden rounded-[4px]",
              onSnake
                ? isHead
                  ? "bg-zinc-900"
                  : "bg-zinc-700"
                : "bg-white/70",
            )}
          >
            {target && !onSnake && (
              <div className="absolute inset-[1px] flex flex-col items-center justify-center rounded-[3px] bg-[#D3DA00] px-0.5 text-center">
                <Zap className="mb-0.5 h-2.5 w-2.5 text-zinc-900" />
                <span className="max-w-full truncate text-[7px] font-bold leading-none text-zinc-900">
                  {device
                    ? DEVICE_SHORT[device.type]
                    : DEVICE_SHORT[target.type]}
                </span>
              </div>
            )}
            {isHead && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D3DA00]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PanelGameScreen({
  panels,
  onBack,
  onAddPanel,
  quota = null,
  onRefreshQuota,
}: {
  panels: PanelObject[];
  onBack: () => void;
  onAddPanel?: () => void;
  quota?: PanelQuota | null;
  onRefreshQuota?: () => Promise<unknown>;
}) {
  const playable = panels.filter(
    (panel) => playDevices(panel).length > 0,
  );
  const hasAnyPanel = panels.length > 0;

  const [phase, setPhase] = useState<Phase>(() =>
    !hasAnyPanel ? "gate" : "pick",
  );
  const [panelId, setPanelId] = useState<string | null>(null);
  const [gameKind, setGameKind] = useState<GameKind>("puzzle");
  const [state, setState] = useState<SnakeGameState | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [pickingHole, setPickingHole] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [lifeSheetOpen, setLifeSheetOpen] = useState(false);
  const [holeSheetOpen, setHoleSheetOpen] = useState(false);
  const [continuesUsed, setContinuesUsed] = useState(readSnakeContinuesUsed);

  const panel = useMemo(
    () => panels.find((item) => item.id === panelId) ?? null,
    [panels, panelId],
  );
  const devices = useMemo(
    () => (panel ? playDevices(panel) : []),
    [panel],
  );
  const devicesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device])),
    [devices],
  );
  const collectedIds = useMemo(() => {
    if (puzzle) return placedDeviceIds(puzzle, devices);
    return collectedDeviceIds(state?.collected ?? [], devices);
  }, [devices, puzzle, state?.collected]);
  const collectedCount = state?.collected.length ?? 0;
  const totalModules = moduleTotal(devices);
  const puzzlePlaced = puzzle ? placedModuleCount(puzzle) : 0;
  const puzzleTotal = puzzle ? puzzleModuleTotal(puzzle) : totalModules;
  const extraHoleUnlocked = hasUnlockedPanelLimit(quota?.creditedInvites ?? 0);
  const continuesLeft = snakeContinuesAvailable(
    quota?.creditedInvites ?? 0,
    continuesUsed,
  );
  const viewPhase: Phase = !hasAnyPanel
    ? "gate"
    : phase === "gate"
      ? "pick"
      : phase;
  const playingSnake = viewPhase === "play" && gameKind === "snake";
  const playingPuzzle = viewPhase === "play" && gameKind === "puzzle";
  const puzzleInProgress = Boolean(
    playingPuzzle && puzzle && puzzle.moves > 0 && !puzzle.won,
  );
  const snakeInProgress = Boolean(
    playingSnake && state && state.alive && !state.won,
  );

  const stateRef = useRef(state);
  const puzzleRef = useRef(puzzle);
  const devicesRef = useRef(devices);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    stateRef.current = state;
    puzzleRef.current = puzzle;
    devicesRef.current = devices;
  }, [devices, puzzle, state]);

  const startSnake = useCallback((selected: PanelObject) => {
    const list = playDevices(selected);
    if (list.length === 0) return;
    setPanelId(selected.id);
    setGameKind("snake");
    setPuzzle(null);
    setPickingHole(false);
    setState(createSnakeGame(list));
    setPhase("play");
    hapticImpact("soft");
  }, [setGameKind, setPanelId, setPhase, setPickingHole, setPuzzle, setState]);

  const startPuzzle = useCallback((selected: PanelObject) => {
    const list = playDevices(selected);
    if (list.length === 0) return;
    setPanelId(selected.id);
    setGameKind("puzzle");
    setState(null);
    setPickingHole(false);
    setPuzzle(createPanelPuzzle(list, selected.railCount));
    setPhase("play");
    hapticImpact("soft");
  }, [setGameKind, setPanelId, setPhase, setPickingHole, setPuzzle, setState]);

  const readyPanel = useCallback((selected: PanelObject) => {
    setPanelId(selected.id);
    setState(null);
    setPuzzle(null);
    setPickingHole(false);
    setPhase("ready");
  }, [setPanelId, setPhase, setPickingHole, setPuzzle, setState]);

  const leavePlay = useCallback(() => {
    setPhase("pick");
    setState(null);
    setPuzzle(null);
    setPickingHole(false);
  }, [setPhase, setPickingHole, setPuzzle, setState]);

  useEffect(() => {
    if (!playingSnake || !state?.alive || state.won) return;
    const id = window.setInterval(() => {
      const current = stateRef.current;
      if (!current || !current.alive || current.won) return;
      const next = stepSnakeGame(current, devicesRef.current);
      if (next === current) return;
      setState(next);
      if (next.won) {
        hapticNotification("success");
      } else if (!next.alive) {
        hapticNotification("error");
      } else if (next.collected.length > current.collected.length) {
        hapticImpact("medium");
      }
    }, SNAKE_TICK_MS);
    return () => window.clearInterval(id);
  }, [playingSnake, state?.alive, state?.won]);

  const turn = useCallback((dir: SnakeDir) => {
    setState((prev) => (prev ? setSnakeDirection(prev, dir) : prev));
  }, [setState]);

  useEffect(() => {
    if (!playingSnake) return;
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, SnakeDir> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      turn(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playingSnake, turn]);

  useEffect(() => {
    if (!playingPuzzle || pickingHole) return;
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      const current = puzzleRef.current;
      if (!current) return;
      const next = slidePuzzleHole(current, dir);
      if (next === current) return;
      setPuzzle(next);
      if (next.won) hapticNotification("success");
      else hapticImpact("soft");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickingHole, playingPuzzle]);

  const restart = () => {
    if (!panel) return;
    setLifeSheetOpen(false);
    setHoleSheetOpen(false);
    setPickingHole(false);
    if (gameKind === "puzzle") {
      setPuzzle(createPanelPuzzle(playDevices(panel), panel.railCount));
    } else {
      setState(createSnakeGame(playDevices(panel)));
    }
    hapticImpact("soft");
  };

  const onPuzzleTile = useCallback(
    (index: number) => {
      if (!puzzle) return;
      if (pickingHole) {
        if (!canRemovePuzzleTile(puzzle, index)) {
          hapticNotification("error");
          return;
        }
        const next = removeExtraPuzzleHole(puzzle, index);
        setPickingHole(false);
        setPuzzle(next);
        hapticImpact("medium");
        if (next.won) hapticNotification("success");
        return;
      }
      const next = slidePuzzleTile(puzzle, index);
      if (next === puzzle) return;
      setPuzzle(next);
      if (next.won) hapticNotification("success");
      else hapticImpact("soft");
    },
    [pickingHole, puzzle, setPickingHole, setPuzzle],
  );

  const requestExtraHole = useCallback(() => {
    if (!puzzle || puzzle.extraHoleUsed || puzzle.won) return;
    if (!extraHoleUnlocked) {
      void onRefreshQuota?.();
      setHoleSheetOpen(true);
      return;
    }
    setPickingHole(true);
    hapticImpact("soft");
  }, [
    extraHoleUnlocked,
    onRefreshQuota,
    puzzle,
    setHoleSheetOpen,
    setPickingHole,
  ]);

  const applyContinue = useCallback(() => {
    setState((prev) => (prev ? continueSnakeGame(prev) : prev));
    setContinuesUsed((used) => {
      const next = used + 1;
      writeSnakeContinuesUsed(next);
      return next;
    });
    setLifeSheetOpen(false);
    hapticNotification("success");
  }, [setContinuesUsed, setLifeSheetOpen, setState]);

  const creditsRef = useRef<number | null>(null);
  useEffect(() => {
    const current = quota?.creditedInvites ?? 0;
    if (creditsRef.current == null) {
      creditsRef.current = current;
      return;
    }
    const prev = creditsRef.current;
    creditsRef.current = current;
    if (current <= prev) return;
    if (playingSnake && state && !state.alive && !state.won) {
      const available = snakeContinuesAvailable(current, continuesUsed);
      if (available < 1) return;
      const timer = window.setTimeout(() => applyContinue(), 0);
      return () => window.clearTimeout(timer);
    }
    if (playingPuzzle && holeSheetOpen && hasUnlockedPanelLimit(current)) {
      const timer = window.setTimeout(() => {
        setHoleSheetOpen(false);
        setPickingHole(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [
    applyContinue,
    continuesUsed,
    holeSheetOpen,
    playingPuzzle,
    playingSnake,
    quota?.creditedInvites,
    setHoleSheetOpen,
    setPickingHole,
    state,
  ]);

  useEffect(() => {
    const waiting =
      lifeSheetOpen ||
      holeSheetOpen ||
      (playingSnake && state && !state.alive && !state.won);
    if (!waiting || !onRefreshQuota) return;
    void onRefreshQuota();
    const id = window.setInterval(() => {
      void onRefreshQuota();
    }, 4000);
    return () => window.clearInterval(id);
  }, [
    holeSheetOpen,
    lifeSheetOpen,
    onRefreshQuota,
    playingSnake,
    state,
  ]);

  const title =
    viewPhase === "gate"
      ? "Игра"
      : viewPhase === "pick"
        ? "Выберите щиток"
        : viewPhase === "ready"
          ? "Выберите игру"
          : gameKind === "puzzle"
            ? "Пятнашки"
            : panel?.title ?? "Змейка";

  const subtitle =
    playingPuzzle && puzzle
      ? pickingHole
        ? "Нажмите пустую плитку, чтобы убрать её"
        : `На месте ${puzzlePlaced} из ${puzzleTotal}`
      : playingSnake
        ? `Собрано ${collectedCount} из ${totalModules}`
        : "Соберите схему своего щитка";

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (snakeInProgress || puzzleInProgress) {
              setConfirmLeave(true);
              return;
            }
            if (pickingHole) {
              setPickingHole(false);
              return;
            }
            if (viewPhase === "ready" || viewPhase === "play") {
              leavePlay();
              return;
            }
            onBack();
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate ty-title">
            {title}
          </h1>
          <p className="ty-note">{subtitle}</p>
        </div>
        {viewPhase === "play" && (
          <button
            type="button"
            onClick={restart}
            className="rounded-full px-3 py-2 ty-label text-zinc-600"
          >
            Заново
          </button>
        )}
      </header>

      {viewPhase === "gate" && (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D3DA00]/35">
            <Zap className="h-7 w-7 text-zinc-900" />
          </div>
          <h2 className="ty-title">
            Сначала добавьте щиток
          </h2>
          <p className="mt-3 max-w-sm ty-body">
            Игра открывается после добавления хотя бы одного щитка. В пятнашках
            нужно собрать схему своего щитка — каждый квадрат это один модуль.
          </p>
          {onAddPanel ? (
            <Button className="mt-6 w-full max-w-sm rounded-full" onClick={onAddPanel}>
              Добавить щиток
            </Button>
          ) : (
            <Button className="mt-6 w-full max-w-sm rounded-full" onClick={onBack}>
              К щиткам
            </Button>
          )}
        </div>
      )}

      {viewPhase === "pick" && (
        <div className="flex flex-1 flex-col gap-3">
          <p className="ty-body">
            Выберите щиток — его схема станет полем пятнашек: один квадрат, один
            модуль.
          </p>
          {playable.length === 0 ? (
            <div className="rounded-[24px] border border-black/8 bg-white px-4 py-6 text-center">
              <p className="ty-heading">
                В щитках нет приборов
              </p>
              <p className="mt-2 ty-body">
                Добавьте хотя бы один прибор на схему щитка, чтобы начать игру.
              </p>
              <Button className="mt-5 w-full" onClick={onBack}>
                К щиткам
              </Button>
            </div>
          ) : (
            playable.map((item) => {
              const list = playDevices(item);
              const count = list.length;
              const modules = moduleTotal(list);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => readyPanel(item)}
                  className="flex w-full items-center gap-3 rounded-[22px] border border-black/8 bg-white px-4 py-4 text-left transition active:scale-[0.99]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100">
                    <Zap className="h-5 w-5 text-zinc-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate ty-heading">
                      {item.title}
                    </div>
                    <div className="mt-0.5 ty-note">
                      {count}{" "}
                      {count === 1
                        ? "прибор"
                        : count < 5
                          ? "прибора"
                          : "приборов"}
                      {modules !== count ? ` · ${modules} модулей` : ""}
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-zinc-400" />
                </button>
              );
            })
          )}
        </div>
      )}

      {viewPhase === "ready" && panel && (
        <div className="flex flex-1 flex-col">
          <PanelMiniature
            devices={devices}
            railCount={panel.railCount}
            collectedIds={new Set()}
          />
          <p className="mt-4 ty-body">
            Соберите ряды щитка сверху вниз: первый модуль — в левом верхнем
            углу. Если прибор занимает несколько модулей, его части идут
            подряд, как на схеме.
          </p>
          <div className="mt-auto space-y-3 pt-6">
            <Button className="w-full" onClick={() => startPuzzle(panel)}>
              <Grid3x3 className="h-5 w-5" />
              Пятнашки
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => startSnake(panel)}
            >
              <Zap className="h-5 w-5" />
              Змейка
            </Button>
          </div>
        </div>
      )}

      {playingPuzzle && panel && puzzle && (
        <div className="flex flex-1 flex-col">
          <PanelMiniature
            devices={devices}
            railCount={panel.railCount}
            collectedIds={collectedIds}
            className="mb-4"
          />

          <div className="relative mx-auto w-full max-w-[420px]">
            <PanelPuzzleBoard
              state={puzzle}
              pickingHole={pickingHole}
              onTileClick={onPuzzleTile}
            />

            {puzzle.won && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-white/90 p-5 text-center backdrop-blur-sm">
                <div>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D3DA00]">
                    <Check className="h-6 w-6 text-zinc-900" />
                  </div>
                  <h2 className="ty-title">Щиток собран</h2>
                  <p className="mt-3 ty-body">
                    Схема «{panel.title}» совпала с полем пятнашек.
                  </p>
                  <div className="mt-5 flex gap-3">
                    <Button
                      className="flex-1"
                      variant="secondary"
                      onClick={leavePlay}
                    >
                      Другой щиток
                    </Button>
                    <Button className="flex-1" onClick={restart}>
                      Ещё раз
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!puzzle.won && (
            <div className="mx-auto mt-4 w-full max-w-[420px] space-y-3">
              {pickingHole ? (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setPickingHole(false)}
                >
                  Отмена
                </Button>
              ) : puzzle.extraHoleUsed ? (
                <p className="ty-note">
                  На поле две свободные ячейки. Сдвиньте плитку к пустому
                  квадрату — ряды щитка собираются сверху вниз, слева направо.
                </p>
              ) : (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={requestExtraHole}
                >
                  <UserPlus className="h-5 w-5" />
                  {extraHoleUnlocked
                    ? "Удалить ещё одну ячейку"
                    : "Ещё одна ячейка — за приглашение"}
                </Button>
              )}
              {!pickingHole && !puzzle.extraHoleUsed && (
                <p className="ty-note">
                  Свободна одна ячейка. На плитке: тип прибора, номинал и часть
                  корпуса (1/2, 2/2…), чтобы собрать прибор по порядку.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {playingSnake && panel && state && (
        <div className="flex flex-1 flex-col">
          <PanelMiniature
            devices={devices}
            railCount={panel.railCount}
            collectedIds={collectedIds}
            className="mb-4"
          />

          <div
            className="relative mx-auto w-full max-w-[420px] touch-none"
            onPointerDown={(event) => {
              pointer.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={(event) => {
              const start = pointer.current;
              pointer.current = null;
              if (!start) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
              if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? "right" : "left");
              else turn(dy > 0 ? "down" : "up");
            }}
            onPointerCancel={() => {
              pointer.current = null;
            }}
          >
            <SnakeBoard state={state} devicesById={devicesById} />

            {(!state.alive || state.won) && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-white/90 p-5 text-center backdrop-blur-sm">
                {state.won ? (
                  <div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D3DA00]">
                      <Check className="h-6 w-6 text-zinc-900" />
                    </div>
                    <h2 className="ty-title">
                      Щиток собран
                    </h2>
                    <p className="mt-3 ty-body">
                      Все приборы с «{panel.title}» собраны — щиток снова
                      горит.
                    </p>
                    <div className="mt-5 flex gap-3">
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={leavePlay}
                      >
                        Другой щиток
                      </Button>
                      <Button className="flex-1" onClick={restart}>
                        Ещё раз
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="ty-title">
                      Удар о стену
                    </h2>
                    <p className="mt-3 ty-body">
                      Змейка врезалась. Можно начать заново или восстановить
                      жизнь, пригласив человека в Током.
                    </p>
                    <div className="mt-5 space-y-2">
                      {continuesLeft > 0 ? (
                        <Button className="w-full" onClick={applyContinue}>
                          Продолжить
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => {
                            void onRefreshQuota?.();
                            setLifeSheetOpen(true);
                          }}
                        >
                          <UserPlus className="h-5 w-5" />
                          Восстановить жизнь
                        </Button>
                      )}
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={restart}
                      >
                        Заново
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mx-auto mt-4 max-w-[420px] ty-note">
            Смахивайте или стрелками. Клетка прибора равна одному модулю в
            щитке
            {state.targets[0]
              ? `. Сейчас на поле: ${
                  devicesById.get(state.targets[0].deviceId)
                    ? deviceShortLabel(
                        devicesById.get(state.targets[0].deviceId)!,
                      )
                    : DEVICE_SHORT[state.targets[0].type]
                }`
              : ""}
            .
          </p>
        </div>
      )}

      {lifeSheetOpen && quota && (
        <PanelLimitSheet
          quota={quota}
          reason="snake-life"
          onClose={() => setLifeSheetOpen(false)}
        />
      )}

      {holeSheetOpen && quota && (
        <PanelLimitSheet
          quota={quota}
          reason="puzzle-hole"
          onClose={() => {
            setHoleSheetOpen(false);
            if (extraHoleUnlocked) setPickingHole(true);
          }}
        />
      )}

      {confirmLeave && (
        <ConfirmDialog
          title="Выйти из игры?"
          description="Прогресс текущей партии не сохранится."
          confirmLabel="Выйти"
          cancelLabel="Остаться"
          danger={false}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => {
            setConfirmLeave(false);
            leavePlay();
          }}
        />
      )}
    </motion.section>
  );
}
