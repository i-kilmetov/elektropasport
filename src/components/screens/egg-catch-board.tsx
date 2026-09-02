"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { dirFromSwipe } from "@/lib/panel-game";
import {
  EGG_LANES,
  EGG_ROWS,
  type EggCatchState,
  type EggItem,
} from "@/lib/egg-catch-game";

function WolfSprite({ side }: { side: 0 | 1 }) {
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "absolute bottom-2 flex h-14 w-[46%] items-end justify-center",
        side === 0 ? "left-1" : "right-1",
      )}
    >
      <div className="relative">
        <div className="h-8 w-10 rounded-t-full bg-zinc-800" />
        <div
          className={cn(
            "absolute -top-1 h-3 w-8 rounded-sm bg-zinc-700",
            side === 0 ? "-right-4 rotate-12" : "-left-4 -rotate-12",
          )}
        />
        <div className="absolute -top-2 left-1 h-2 w-2 rounded-full bg-zinc-900" />
        <div className="absolute -top-2 right-1 h-2 w-2 rounded-full bg-zinc-900" />
        <div
          className={cn(
            "absolute bottom-0 h-4 w-12 rounded-b-md border-2 border-zinc-900 bg-[#D3DA00]",
            side === 0 ? "-right-5" : "-left-5",
          )}
        />
      </div>
    </motion.div>
  );
}

function EggSprite({ egg }: { egg: EggItem }) {
  const good = egg.scenario.kind === "good";
  const lanePct = 100 / EGG_LANES;
  const rowPct = 100 / EGG_ROWS;

  return (
    <motion.div
      layout
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        left: `${egg.lane * lanePct + lanePct * 0.11}%`,
        top: `${egg.row * rowPct + rowPct * 0.08}%`,
        scale: 1,
        opacity: 1,
      }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="absolute z-[2]"
      style={{
        width: `${lanePct * 0.78}%`,
        height: `${rowPct * 0.84}%`,
      }}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center rounded-full border-2 px-0.5 text-center shadow-sm",
          good
            ? "border-emerald-700 bg-emerald-50 text-emerald-950"
            : "border-rose-700 bg-rose-50 text-rose-950",
        )}
      >
        <span className="text-[8px] font-bold leading-tight">
          {egg.scenario.label}
        </span>
      </div>
    </motion.div>
  );
}

export function EggCatchBoard({
  state,
  onSide,
}: {
  state: EggCatchState;
  onSide: (side: 0 | 1) => void;
}) {
  const pointer = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="mb-3 flex items-center justify-between rounded-[16px] bg-zinc-100 px-4 py-2 font-mono text-[13px] font-bold">
        <span>Очки {state.score}</span>
        <span>
          {"♥".repeat(state.lives)}
          {"♡".repeat(Math.max(0, 3 - state.lives))}
        </span>
        <span>{state.caught}</span>
      </div>

      <div
        className="relative touch-none overflow-hidden rounded-[20px] border-4 border-zinc-800 bg-[#b8bcb8] p-2 shadow-[inset_0_0_0_3px_#8a8e8a]"
        style={{ height: "min(58dvh, 420px)" }}
        onPointerDown={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = pointer.current;
          pointer.current = null;
          if (!start) return;
          const dir = dirFromSwipe(
            event.clientX - start.x,
            event.clientY - start.y,
            24,
          );
          if (dir === "left") onSide(0);
          else if (dir === "right") onSide(1);
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        <div
          className="absolute inset-2 grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${EGG_LANES}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${EGG_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: EGG_LANES * EGG_ROWS }, (_, index) => (
            <div
              key={`lane-${index}`}
              className={cn(
                "border border-zinc-700/15",
                Math.floor(index / EGG_LANES) === EGG_ROWS - 2 &&
                  "bg-zinc-900/5",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="popLayout">
          {state.eggs.map((egg) => (
            <EggSprite key={egg.id} egg={egg} />
          ))}
        </AnimatePresence>

        <WolfSprite side={state.wolfSide} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSide(0)}
          className={cn(
            "rounded-[14px] border-2 py-3 font-mono text-xs font-bold uppercase tracking-wider",
            state.wolfSide === 0
              ? "border-zinc-900 bg-zinc-900 text-[#D3DA00]"
              : "border-black/10 bg-white text-zinc-700",
          )}
        >
          ← Лево
        </button>
        <button
          type="button"
          onClick={() => onSide(1)}
          className={cn(
            "rounded-[14px] border-2 py-3 font-mono text-xs font-bold uppercase tracking-wider",
            state.wolfSide === 1
              ? "border-zinc-900 bg-zinc-900 text-[#D3DA00]"
              : "border-black/10 bg-white text-zinc-700",
          )}
        >
          Право →
        </button>
      </div>

      <AnimatePresence mode="wait">
        {state.feedback ? (
          <motion.p
            key={state.feedback.text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mt-3 rounded-[16px] px-3 py-2 text-center text-[13px] leading-snug",
              state.feedback.ok
                ? "bg-emerald-50 text-emerald-900"
                : "bg-rose-50 text-rose-900",
            )}
          >
            {state.feedback.text}
          </motion.p>
        ) : (
          <p className="mt-3 text-center ty-note">
            Зелёные «яйца» — безопасные решения, ловите. Красные — опасные,
            пропускайте. Свайп или кнопки влево/вправо.
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}
