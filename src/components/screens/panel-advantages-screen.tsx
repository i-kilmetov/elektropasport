"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  ClipboardList,
  Hammer,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import type { NoPanelSetupId } from "@/lib/no-panel-setups";

const inletStages = [
  {
    icon: MessageCircle,
    title: "1. Консультирование",
    text: "Разберём вашу задачу и подскажем, как сделать электрику грамотно с нуля.",
  },
  {
    icon: ClipboardList,
    title: "2. Проектирование схемы",
    text: "Спроектируем схему электрики в квартире или доме под ваши помещения и нагрузки.",
  },
  {
    icon: Hammer,
    title: "3. Монтажные работы",
    text: "Выполним монтаж: трассы, щиток, защита и проверка — чтобы всё было безопасно и по делу.",
  },
];

export function PanelAdvantagesScreen({
  setupId,
  onBack,
  onInstall,
}: {
  setupId?: NoPanelSetupId | null;
  onBack: () => void;
  onInstall: () => void;
}) {
  const isInletCable = setupId === "inlet_cable";

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
        <h1 className="text-[20px] font-semibold text-white">
          Сделать правильно
        </h1>
      </header>

      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-[var(--accent)]/15 text-[var(--accent)]">
          <BreakerIcon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold leading-snug text-white">
            {isInletCable
              ? "С нуля можно сделать электрику правильно"
              : "Правильнее всего — собрать грамотный щиток"}
          </h2>
        </div>
      </div>

      <GlassCard className="mb-4 p-4">
        <div className="mb-2 flex items-center gap-2 text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="text-[13px] font-semibold">Цель</span>
        </div>
        <p className="text-[14px] leading-relaxed text-white/65">
          {isInletCable
            ? "Пока есть только вводной кабель, можно сразу заложить современную схему: трассы, щиток, защиту и запас под будущую технику — без переделок после ремонта."
            : "Современный электрощиток с вводным автоматом, УЗО/дифавтоматами и раздельными линиями — самый надёжный способ сделать электрику безопасной, понятной и готовой к нагрузкам."}
        </p>
      </GlassCard>

      {isInletCable ? (
        <div className="mb-6 flex-1 space-y-3 overflow-y-auto pb-2">
          <h3 className="text-[15px] font-semibold text-white/80">
            Этапы работ
          </h3>
          {inletStages.map((stage) => (
            <GlassCard key={stage.title} className="p-4">
              <div className="mb-2 flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  <stage.icon className="h-4 w-4" />
                </span>
                <h4 className="text-[15px] font-semibold text-white">
                  {stage.title}
                </h4>
              </div>
              <p className="text-[14px] leading-relaxed text-white/55">
                {stage.text}
              </p>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="mb-6 border-amber-400/20 bg-amber-500/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-[13px] font-semibold">Важный нюанс</span>
          </div>
          <p className="text-[14px] leading-relaxed text-amber-50/90">
            Если в квартире или доме уже собрана электрика в старом исполнении,
            сборка щитка будет ограничена существующей схемой и проводкой. Мы
            сделаем максимум в этих условиях — и подскажем, что можно улучшить
            сейчас, а что лучше заложить при ремонте.
          </p>
        </GlassCard>
      )}

      <div className="mt-auto pt-2">
        <Button className="w-full" size="lg" onClick={onInstall}>
          Заказать консультацию
        </Button>
      </div>
    </motion.section>
  );
}
