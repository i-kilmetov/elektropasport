"use client";

import { motion } from "framer-motion";
import { Menu, Plus } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { PanelObject } from "@/types";

export function ObjectsScreen({
  panels,
  onAdd,
  onOpen,
  onNoPanel,
}: {
  panels: PanelObject[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onNoPanel: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl"
          aria-label="Меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Мои щитки</h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_6px_24px_rgba(124,92,255,0.4)]"
          aria-label="Добавить щиток"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3">
        {panels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center px-4 text-center"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-[var(--accent)]">
              <BreakerIcon className="h-10 w-10" />
            </div>
            <p className="max-w-[300px] text-[15px] leading-relaxed text-white/50">
              Сфотографируйте существующий щиток или расскажите, как у вас
              устроена электрика без него.
            </p>
          </motion.div>
        ) : (
          panels.map((obj, i) => (
            <motion.button
              key={obj.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              onClick={() => onOpen(obj.id)}
              className="text-left"
            >
              <GlassCard className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.09]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-violet-500/30 to-violet-600/10 text-violet-300">
                  <BreakerIcon className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <h2 className="truncate text-[17px] font-semibold text-white">
                      {obj.title}
                    </h2>
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      {obj.safety}%
                    </span>
                  </div>
                  <p className="truncate text-[13px] text-white/45">{obj.address}</p>
                  <p className="mt-1 text-[12px] text-white/35">
                    {obj.breakers} устройств · {obj.lastCheck}
                  </p>
                </div>
              </GlassCard>
            </motion.button>
          ))
        )}
      </div>

      <div className="mt-6 space-y-4">
        <Button className="w-full" onClick={onAdd}>
          <Plus className="h-5 w-5" />
          Добавить щиток
        </Button>
        <button
          type="button"
          onClick={onNoPanel}
          className="w-full text-center text-[15px] font-medium text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white/85"
        >
          У меня нет щитка
        </button>
      </div>
    </motion.section>
  );
}
