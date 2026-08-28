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
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
        <h1 className="ty-title">Нет щитка</h1>
      </header>

      <h2 className="ty-title mb-3 shrink-0">
        Как у вас устроена электрика?
      </h2>

      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5">
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
                "flex min-h-0 flex-col overflow-hidden rounded-[24px] border p-3 text-left shadow-[0_8px_24px_rgba(17,17,19,0.06)] transition-transform active:scale-[0.98]",
                style.card,
              )}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-[16px] sm:h-14 sm:w-14 sm:rounded-[18px]",
                    style.icon,
                  )}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                </span>
              </div>
              <div className="mt-1 px-0.5 pb-0.5">
                <div className="ty-heading">
                  {NO_PANEL_CARD_TITLES[setup.id]}
                </div>
                <p
                  className={cn(
                    "ty-note mt-1 line-clamp-3",
                    style.body,
                  )}
                >
                  {setup.subtitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="ty-note mt-3 shrink-0">
        Выберите похожий вариант — покажем риски и что лучше сделать.
      </p>
    </motion.section>
  );
}
