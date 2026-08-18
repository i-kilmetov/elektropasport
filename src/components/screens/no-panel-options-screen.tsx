"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import {
  NoPanelSetupArt,
  noPanelCardVisual,
} from "@/components/icons/no-panel-setup-art";
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
          const visual = noPanelCardVisual(setup.id);
          return (
            <motion.button
              key={setup.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(setup.id)}
              className={cn(
                "flex min-h-[230px] flex-col overflow-hidden rounded-[28px] border border-black/[0.04] p-3 text-left shadow-[0_8px_24px_rgba(17,17,19,0.06)] transition-transform active:scale-[0.98]",
                visual.bg,
              )}
            >
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <NoPanelSetupArt id={setup.id} className="h-full max-h-[120px] w-full" />
              </div>
              <div className="mt-1 px-1 pb-1">
                <div className="text-[15px] font-bold leading-snug tracking-tight">
                  {visual.title}
                </div>
                <p className="mt-1 text-[12px] font-medium leading-snug opacity-70">
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
