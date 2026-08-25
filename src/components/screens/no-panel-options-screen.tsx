"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import {
  brandChoiceClasses,
  NO_PANEL_CARD_TITLES,
  NO_PANEL_CARD_VARIANTS,
} from "@/lib/brand-choice-card";
import { noPanelSetups, type NoPanelSetupId } from "@/lib/no-panel-setups";
import { cn } from "@/lib/utils";

export function NoPanelOptionsScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (id: NoPanelSetupId) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">Нет щитка</h1>
      </header>

      <h2 className="mb-4 text-[24px] font-bold tracking-tight text-zinc-900">
        Подскажите, как у вас устроена электрика?
      </h2>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {noPanelSetups.map((setup, i) => {
          const variant = NO_PANEL_CARD_VARIANTS[setup.id];
          const style = brandChoiceClasses[variant];
          const Icon = setup.icon;

          return (
            <motion.button
              key={setup.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(setup.id)}
              className={cn(
                "flex min-h-[210px] flex-col overflow-hidden rounded-[28px] border p-3 text-left shadow-[0_8px_24px_rgba(17,17,19,0.06)] transition-transform active:scale-[0.98]",
                style.card,
              )}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center py-2">
                <span
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-[20px]",
                    style.icon,
                  )}
                >
                  <Icon className="h-8 w-8" strokeWidth={1.75} />
                </span>
              </div>
              <div className="mt-1 px-1 pb-1">
                <div className="text-[15px] font-bold leading-snug tracking-tight">
                  {NO_PANEL_CARD_TITLES[setup.id]}
                </div>
                <p className={cn("mt-1 text-[12px] font-medium leading-snug", style.body)}>
                  {setup.subtitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-5 text-[14px] leading-relaxed text-zinc-500">
        Выберите вариант, который больше похож на вашу ситуацию. Мы покажем
        основные риски и что лучше сделать.
      </p>
    </motion.section>
  );
}
