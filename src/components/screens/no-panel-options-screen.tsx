"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { noPanelSetups, type NoPanelSetupId } from "@/lib/no-panel-setups";

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
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Нет щитка</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-white">
        Как у вас устроена электрика?
      </h2>
      <p className="mb-6 text-[15px] leading-relaxed text-white/50">
        Выберите вариант, который больше похож на вашу ситуацию. Мы покажем
        основные риски и что лучше сделать.
      </p>

      <div className="flex flex-col gap-3">
        {noPanelSetups.map((setup, i) => {
          const Icon = setup.icon;
          return (
            <motion.button
              key={setup.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(setup.id)}
              className="text-left"
            >
              <GlassCard className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.09]">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br ${setup.iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold text-white">
                    {setup.title}
                  </div>
                  <div className="mt-1 text-[13px] leading-snug text-white/45">
                    {setup.subtitle}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-white/35" />
              </GlassCard>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
