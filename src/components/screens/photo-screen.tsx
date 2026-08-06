"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

const tips = [
  "Хорошее освещение",
  "Камера прямо перед щитком",
  "Все устройства в кадре",
];

export function PhotoScreen({
  onBack,
  onCapture,
}: {
  onBack: () => void;
  onCapture: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
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
        <h1 className="text-[20px] font-semibold text-white">Новый щиток</h1>
      </header>

      <div className="mb-6">
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-white">
          Сфотографируйте электрощиток
        </h2>
        <p className="text-[15px] leading-relaxed text-white/50">
          Мы распознаем автоматы, УЗО, реле и шины, затем соберём интерактивную
          схему.
        </p>
      </div>

      <GlassCard className="relative mb-6 overflow-hidden p-0">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1a1a22] to-[#0d0d12]">
          <div className="absolute inset-4 rounded-[16px] border border-white/10 bg-[#14141c] p-3">
            <div className="flex h-full flex-col gap-2 rounded-[12px] border border-white/5 bg-[#0a0a0e] p-2">
              <div className="flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full min-h-[88px] flex-1 rounded-md border border-white/10 bg-gradient-to-b from-zinc-700/40 to-zinc-900/60"
                  >
                    <div className="mx-auto mt-2 h-2 w-2 rounded-full bg-red-400/70" />
                    <div className="mx-auto mt-3 h-8 w-[60%] rounded-sm bg-white/10" />
                  </div>
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <div className="h-6 flex-1 rounded bg-emerald-700/40" />
                <div className="h-6 flex-1 rounded bg-sky-700/40" />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.45))]" />
        </div>
      </GlassCard>

      <ul className="mb-8 space-y-3">
        {tips.map((tip, i) => (
          <motion.li
            key={tip}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex items-center gap-3 text-[15px] text-white/75"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-4 w-4" />
            </span>
            {tip}
          </motion.li>
        ))}
      </ul>

      <div className="mt-auto">
        <Button className="w-full" size="lg" onClick={onCapture}>
          <Camera className="h-5 w-5" />
          Сфотографировать щиток
        </Button>
      </div>
    </motion.section>
  );
}
