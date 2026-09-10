"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CircleDot, ToggleLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export type FloorProtectionKind = "fuses" | "breaker";

export function FloorProtectionQuestionScreen({
  onBack,
  onSelect,
  onSaveAsIs,
}: {
  onBack: () => void;
  onSelect: (kind: FloorProtectionKind) => void;
  /** Optional: save «только этажный щит» without upgrade path. */
  onSaveAsIs?: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <header className="mb-4 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title">Этажный щит</h1>
      </header>

      <GlassCard className="mb-4 p-5">
        <p className="ty-heading text-zinc-900">
          Что стоит в коридорном щите на вашу квартиру?
        </p>
        <p className="mt-2 ty-note text-zinc-600">
          От этого зависит, с чего безопаснее начать улучшения.
        </p>
      </GlassCard>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSelect("fuses")}
          className="flex items-start gap-3 rounded-[18px] border border-black/8 bg-white p-4 text-left transition-colors active:bg-zinc-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-amber-100 text-amber-700">
            <CircleDot className="h-5 w-5" />
          </div>
          <div>
            <p className="ty-heading text-zinc-900">Пробки</p>
            <p className="mt-1 ty-note text-zinc-600">
              Керамические или «автоматические пробки» вместо нормального автомата
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect("breaker")}
          className="flex items-start gap-3 rounded-[18px] border border-black/8 bg-white p-4 text-left transition-colors active:bg-zinc-50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-700">
            <ToggleLeft className="h-5 w-5" />
          </div>
          <div>
            <p className="ty-heading text-zinc-900">Автомат</p>
            <p className="mt-1 ty-note text-zinc-600">
              Современный автоматический выключатель на вводе квартиры
            </p>
          </div>
        </button>
      </div>

      {onSaveAsIs ? (
        <button
          type="button"
          onClick={onSaveAsIs}
          className="mt-auto pt-6 text-center ty-label text-zinc-500 underline-offset-2 hover:underline"
        >
          Пока добавить как есть
        </button>
      ) : null}
    </motion.section>
  );
}
