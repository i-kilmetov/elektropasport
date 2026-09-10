"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  floorUpgradesFor,
  formatEstimateRange,
  type FloorUpgradeId,
} from "@/lib/no-panel-estimates";
import type { FloorProtectionKind } from "@/components/screens/floor-protection-question-screen";

const LEVEL_LABEL: Record<"simple" | "medium" | "deep", string> = {
  simple: "Простой шаг",
  medium: "Средний объём",
  deep: "Полная переделка",
};

export function FloorUpgradeOptionsScreen({
  protection,
  onBack,
  onOrder,
}: {
  protection: FloorProtectionKind;
  onBack: () => void;
  onOrder: (upgradeId: FloorUpgradeId) => void;
}) {
  const options = floorUpgradesFor(protection);

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <header className="mb-3 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title">
          {protection === "fuses" ? "Есть пробки" : "Уже автомат"}
        </h1>
      </header>

      <div className="mb-3 rounded-[18px] border border-black/8 bg-zinc-100 p-4">
        <div className="flex items-start gap-2">
          <Layers className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700" />
          <p className="ty-note text-zinc-700">
            {protection === "fuses"
              ? "От замены пробок на автомат до полной замены электрики в квартире — выберите комфортный объём."
              : "Автомат на площадке — хорошо, но в квартире всё ещё нет своего щитка. Ниже варианты от простого к полному."}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        {options.map((option) => (
          <GlassCard key={option.id} className="p-4">
            <p className="ty-label text-zinc-500">{LEVEL_LABEL[option.level]}</p>
            <p className="mt-1 ty-heading text-zinc-900">{option.title}</p>
            <p className="mt-2 ty-note text-zinc-600">{option.subtitle}</p>
            <p className="mt-3 ty-heading tabular-nums text-zinc-900">
              {formatEstimateRange(option.fromRub, option.toRub)}
            </p>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              onClick={() => onOrder(option.id)}
            >
              Обсудить этот вариант
            </Button>
          </GlassCard>
        ))}
      </div>
    </motion.section>
  );
}
