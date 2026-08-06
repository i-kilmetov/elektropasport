"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Home,
  Menu,
  Plus,
  TreePine,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { panelObjects } from "@/lib/mock-data";
import type { ObjectType } from "@/types";

const typeIcons: Record<ObjectType, typeof Home> = {
  apartment: Building2,
  house: Home,
  garage: Warehouse,
  dacha: TreePine,
};

const typeColors: Record<ObjectType, string> = {
  apartment: "from-violet-500/30 to-violet-600/10 text-violet-300",
  house: "from-emerald-500/30 to-emerald-600/10 text-emerald-300",
  garage: "from-slate-400/30 to-slate-500/10 text-slate-300",
  dacha: "from-amber-600/30 to-amber-700/10 text-amber-300",
};

export function ObjectsScreen({
  onAdd,
  onOpen,
}: {
  onAdd: () => void;
  onOpen: () => void;
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
        {panelObjects.map((obj, i) => {
          const Icon = typeIcons[obj.type];
          return (
            <motion.button
              key={obj.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              onClick={onOpen}
              className="text-left"
            >
              <GlassCard className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.09]">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br ${typeColors[obj.type]}`}
                >
                  <Icon className="h-6 w-6" />
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
                    {obj.breakers} автоматов · {obj.lastCheck}
                  </p>
                </div>
              </GlassCard>
            </motion.button>
          );
        })}

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={onAdd}
          className="mt-1"
        >
          <div className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-8 text-[var(--accent)]">
            <Plus className="h-7 w-7" />
            <span className="text-[15px] font-medium">Добавить щиток</span>
          </div>
        </motion.button>
      </div>

      <div className="mt-6">
        <Button className="w-full" onClick={onAdd}>
          <Plus className="h-5 w-5" />
          Добавить щиток
        </Button>
      </div>
    </motion.section>
  );
}
