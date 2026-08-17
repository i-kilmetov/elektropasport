"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Combine,
  Droplets,
  Home,
  Lightbulb,
  Plug,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  canMovePanelGame,
  createPanelGame,
  movePanelGame,
  panelGameTile,
  readPanelGame,
  readPanelGameBest,
  writePanelGame,
  type PanelGameDir,
  type PanelGameState,
} from "@/lib/panel-game";
import { cn } from "@/lib/utils";

const SWIPE = 36;
const HOWTO_KEY = "elektropasport:panel-game-howto";

const ICONS: Record<number, typeof Lightbulb> = {
  2: Lightbulb,
  4: Lightbulb,
  8: Zap,
  16: Plug,
  32: Zap,
  64: Droplets,
  128: Shield,
  256: Combine,
  512: Zap,
  1024: Home,
  2048: Sparkles,
};

function loadHowToSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(HOWTO_KEY) === "1";
  } catch {
    return true;
  }
}

export function PanelGameScreen({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<PanelGameState>(() =>
    createPanelGame(0),
  );
  const [fact, setFact] = useState(
    "Сдвигайте плитки. Две одинаковые собираются в следующий прибор щитка.",
  );
  const [ready, setReady] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [over, setOver] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const saved = readPanelGame();
    const next = saved ?? createPanelGame(readPanelGameBest());
    setState(next);
    setOver(!canMovePanelGame(next.board));
    setShowWin(next.won && !next.continued);
    setHowTo(!loadHowToSeen());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writePanelGame(state);
  }, [ready, state]);

  const play = useCallback((dir: PanelGameDir) => {
    const current = stateRef.current;
    if (howTo) return;
    if (showWin && !current.continued) return;
    if (!canMovePanelGame(current.board)) return;

    const result = movePanelGame(current, dir);
    if (!result.moved) return;

    hapticImpact(result.merged.length ? "medium" : "light");
    const highest = result.merged.reduce((max, value) => Math.max(max, value), 0);
    const tile = highest ? panelGameTile(highest) : undefined;
    if (tile) setFact(tile.fact);

    const lost = !canMovePanelGame(result.state.board);
    const justWon = result.state.won && !current.won;
    setState(result.state);
    setOver(lost);
    if (justWon) {
      setShowWin(true);
      hapticNotification("success");
    } else if (lost) {
      hapticNotification("error");
    }
  }, [howTo, showWin]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, PanelGameDir> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      play(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play]);

  const restart = () => {
    const next = createPanelGame(state.best);
    setState(next);
    setOver(false);
    setShowWin(false);
    setFact("Новая схема. Соберите щиток от лампочки до ввода.");
    hapticImpact("soft");
  };

  const dismissHowTo = () => {
    try {
      localStorage.setItem(HOWTO_KEY, "1");
    } catch {
      // private mode
    }
    setHowTo(false);
  };

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
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-semibold text-zinc-900">Игра</h1>
          <p className="text-[13px] text-zinc-500">Собери щиток</p>
        </div>
        <button
          type="button"
          onClick={() => (state.score > 0 ? setConfirmNew(true) : restart())}
          className="rounded-full px-3 py-2 text-[13px] font-semibold text-zinc-600"
        >
          Заново
        </button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-black/8 bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Счёт
          </div>
          <div className="mt-1 text-[28px] font-bold tabular-nums leading-none text-zinc-900">
            {state.score}
          </div>
        </div>
        <div className="rounded-[20px] border border-black/8 bg-zinc-900 px-4 py-3 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Рекорд
          </div>
          <div className="mt-1 text-[28px] font-bold tabular-nums leading-none">
            {state.best}
          </div>
        </div>
      </div>

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
          if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? "right" : "left");
          else play(dy > 0 ? "down" : "up");
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        <div className="grid grid-cols-4 gap-2 rounded-[28px] bg-zinc-200/80 p-2">
          {state.board.map((value, index) => {
            const tile = value ? panelGameTile(value) : undefined;
            const Icon = value ? ICONS[value] ?? Zap : Zap;
            return (
              <div
                key={`${index}-${value}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-[18px] px-1 text-center",
                  tile ? tile.className : "bg-white/55",
                )}
              >
                {tile ? (
                  <>
                    <Icon className="mb-0.5 h-5 w-5 opacity-90" />
                    <div className="text-[13px] font-bold leading-none tracking-tight">
                      {tile.title}
                    </div>
                    <div className="mt-1 text-[10px] font-medium leading-none opacity-75">
                      {tile.caption}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        {(over || showWin || howTo) && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-white/88 p-5 text-center backdrop-blur-sm">
            {howTo ? (
              <div>
                <h2 className="text-[22px] font-bold text-zinc-900">
                  Собери щиток
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                  Смахивайте плитки, как в 2048. Две одинаковые собираются в
                  следующий прибор: нагрузка → линия → автомат → УЗО → ввод.
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
                  Так в живом щитке мелкие потребители становятся группами, а
                  группы получают свою защиту.
                </p>
                <Button className="mt-5 w-full" onClick={dismissHowTo}>
                  Играть
                </Button>
              </div>
            ) : showWin ? (
              <div>
                <h2 className="text-[22px] font-bold text-zinc-900">
                  Щиток собран
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                  Нагрузки, линии, автоматы и УЗО сошлись во ввод. Можно идти
                  дальше — до «Дома».
                </p>
                <div className="mt-5 flex gap-3">
                  <Button
                    className="flex-1"
                    variant="secondary"
                    onClick={restart}
                  >
                    Заново
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowWin(false);
                      setState((prev) => ({ ...prev, continued: true }));
                    }}
                  >
                    Дальше
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-[22px] font-bold text-zinc-900">
                  Щиток переполнен
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
                  Места на DIN-рейке не осталось, и соседние приборы больше не
                  собираются. Как в настоящем щитке: без запаса модулей схема
                  «встаёт».
                </p>
                <Button className="mt-5 w-full" onClick={restart}>
                  Новая схема
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mx-auto mt-4 max-w-[420px] text-[14px] leading-relaxed text-zinc-500">
        {fact}
      </p>

      {confirmNew && (
        <ConfirmDialog
          title="Начать заново?"
          description="Текущая схема сбросится. Рекорд сохранится."
          confirmLabel="Заново"
          danger={false}
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            restart();
          }}
        />
      )}
    </motion.section>
  );
}
