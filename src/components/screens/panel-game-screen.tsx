"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Zap } from "lucide-react";
import { DeviceFaceStatic, MODULE_PX } from "@/components/icons/device-face";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  createSnakeGame,
  DEVICE_SHORT,
  deviceShortLabel,
  setSnakeDirection,
  SNAKE_COLS,
  SNAKE_ROWS,
  SNAKE_TICK_MS,
  stepSnakeGame,
  type SnakeDir,
  type SnakeGameState,
} from "@/lib/panel-game";
import { deviceModules, groupDevicesByRail } from "@/lib/panel-rails";
import { cn } from "@/lib/utils";
import type { Device, PanelObject } from "@/types";

const SWIPE = 28;
const MINI_SCALE = 0.42;

type Phase = "gate" | "pick" | "ready" | "play";

/** Same devices as on the scheme miniature (без шин PE/N). */
function playDevices(panel: PanelObject): Device[] {
  if (!Array.isArray(panel.devices)) return [];
  return groupDevicesByRail(panel.devices, panel.railCount).flat();
}

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
          "rounded-[20px] border border-dashed border-black/12 bg-zinc-50 px-4 py-6 text-center text-[13px] text-zinc-500",
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
}: {
  panels: PanelObject[];
  onBack: () => void;
  onAddPanel?: () => void;
}) {
  const playable = panels.filter(
    (panel) => playDevices(panel).length > 0,
  );
  const hasAnyPanel = panels.length > 0;

  const [phase, setPhase] = useState<Phase>(() =>
    !hasAnyPanel ? "gate" : "pick",
  );
  const [panelId, setPanelId] = useState<string | null>(null);
  const [state, setState] = useState<SnakeGameState | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

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
  const collectedIds = useMemo(
    () => new Set(state?.collectedIds ?? []),
    [state?.collectedIds],
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!hasAnyPanel) setPhase("gate");
  }, [hasAnyPanel]);

  const startGame = useCallback((selected: PanelObject) => {
    const list = playDevices(selected);
    if (list.length === 0) return;
    setPanelId(selected.id);
    setState(createSnakeGame(list));
    setPhase("play");
    hapticImpact("soft");
  }, []);

  const readyPanel = useCallback((selected: PanelObject) => {
    setPanelId(selected.id);
    setState(null);
    setPhase("ready");
  }, []);

  useEffect(() => {
    if (phase !== "play" || !state?.alive || state.won) return;
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
      } else if (next.collectedIds.length > current.collectedIds.length) {
        hapticImpact("medium");
      }
    }, SNAKE_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, state?.alive, state?.won]);

  const turn = useCallback((dir: SnakeDir) => {
    setState((prev) => (prev ? setSnakeDirection(prev, dir) : prev));
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
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
  }, [phase, turn]);

  const restart = () => {
    if (!panel) return;
    setState(createSnakeGame(playDevices(panel)));
    hapticImpact("soft");
  };

  const title =
    phase === "gate"
      ? "Игра"
      : phase === "pick"
        ? "Выберите щиток"
        : phase === "ready"
          ? "Змейка"
          : panel?.title ?? "Змейка";

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
            if (phase === "play" && state && state.alive && !state.won) {
              setConfirmLeave(true);
              return;
            }
            if (phase === "ready" || phase === "play") {
              setPhase("pick");
              setState(null);
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
          <h1 className="truncate text-[20px] font-semibold text-zinc-900">
            {title}
          </h1>
          <p className="text-[13px] text-zinc-500">
            {phase === "play"
              ? `Собрано ${state?.collectedIds.length ?? 0} из ${devices.length}`
              : "Собери приборы щитка"}
          </p>
        </div>
        {phase === "play" && (
          <button
            type="button"
            onClick={restart}
            className="rounded-full px-3 py-2 text-[13px] font-semibold text-zinc-600"
          >
            Заново
          </button>
        )}
      </header>

      {phase === "gate" && (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D3DA00]/35">
            <Zap className="h-7 w-7 text-zinc-900" />
          </div>
          <h2 className="text-[22px] font-bold text-zinc-900">
            Сначала добавьте щиток
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-zinc-600">
            Игра открывается после добавления хотя бы одного щитка. Змейка
            собирает приборы именно с вашего щитка.
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

      {phase === "pick" && (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-[14px] leading-relaxed text-zinc-500">
            Выберите щиток — змейка будет собирать его приборы на поле.
          </p>
          {playable.length === 0 ? (
            <div className="rounded-[24px] border border-black/8 bg-white px-4 py-6 text-center">
              <p className="text-[15px] font-semibold text-zinc-900">
                В щитках нет приборов
              </p>
              <p className="mt-2 text-[14px] text-zinc-500">
                Добавьте хотя бы один прибор на схему щитка, чтобы начать игру.
              </p>
              <Button className="mt-5 w-full" onClick={onBack}>
                К щиткам
              </Button>
            </div>
          ) : (
            playable.map((item) => {
              const count = playDevices(item).length;
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
                    <div className="truncate text-[16px] font-semibold text-zinc-900">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[13px] text-zinc-500">
                      {count}{" "}
                      {count === 1
                        ? "прибор"
                        : count < 5
                          ? "прибора"
                          : "приборов"}
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-zinc-400" />
                </button>
              );
            })
          )}
        </div>
      )}

      {phase === "ready" && panel && (
        <div className="flex flex-1 flex-col">
          <PanelMiniature
            devices={devices}
            railCount={panel.railCount}
            collectedIds={new Set()}
          />
          <p className="mt-4 text-[14px] leading-relaxed text-zinc-500">
            Сверху — ваш щиток с погасшими приборами. На поле появятся эти же
            приборы: соберите их все змейкой, чтобы «включить» щиток.
          </p>
          <div className="mt-auto pt-6">
            <Button className="w-full" onClick={() => startGame(panel)}>
              Начать игру
            </Button>
          </div>
        </div>
      )}

      {phase === "play" && panel && state && (
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
                    <h2 className="text-[22px] font-bold text-zinc-900">
                      Щиток собран
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                      Все приборы с «{panel.title}» собраны — щиток снова
                      горит.
                    </p>
                    <div className="mt-5 flex gap-3">
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => {
                          setPhase("pick");
                          setState(null);
                        }}
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
                    <h2 className="text-[22px] font-bold text-zinc-900">
                      Удар о стену
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                      Змейка врезалась. Попробуйте снова — приборы всё ещё ждут
                      на поле.
                    </p>
                    <Button className="mt-5 w-full" onClick={restart}>
                      Заново
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mx-auto mt-4 max-w-[420px] text-[13px] leading-relaxed text-zinc-500">
            Смахивайте или стрелками. Цель — собрать все приборы с выбранного
            щитка
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
            setPhase("pick");
            setState(null);
          }}
        />
      )}
    </motion.section>
  );
}
