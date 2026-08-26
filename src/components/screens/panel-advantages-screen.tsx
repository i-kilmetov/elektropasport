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
    text: "Разберём задачу и подскажем, как сделать электрику грамотно с нуля.",
  },
  {
    icon: ClipboardList,
    title: "2. Проектирование схемы",
    text: "Спроектируем схему под ваши помещения и нагрузки.",
  },
  {
    icon: Hammer,
    title: "3. Монтажные работы",
    text: "Трассы, щиток, защита и проверка — безопасно и по делу.",
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
        <h1 className="text-[18px] font-semibold text-zinc-900 sm:text-[20px]">
          Сделать правильно
        </h1>
      </header>

      <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#D3DA00] text-[#111113]">
          <BreakerIcon className="h-7 w-7" />
        </div>
        <h2 className="text-[17px] font-bold leading-snug text-zinc-900 sm:text-[19px]">
          {isInletCable
            ? "С нуля можно сделать электрику правильно"
            : "Правильнее всего — собрать грамотный щиток"}
        </h2>
      </div>

      <GlassCard className="mb-3 shrink-0 p-3">
        <div className="mb-1.5 flex items-center gap-2 text-[#111113]">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="text-[13px] font-semibold">Цель</span>
        </div>
        <p className="text-[13px] leading-snug text-zinc-600 sm:text-[14px]">
          {isInletCable
            ? "Пока есть только вводной кабель, можно сразу заложить современную схему: трассы, щиток, защиту и запас под технику — без переделок после ремонта."
            : "Современный щиток с вводным автоматом, УЗО/дифавтоматами и раздельными линиями — надёжный способ сделать электрику безопасной и готовой к нагрузкам."}
        </p>
      </GlassCard>

      {isInletCable ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <h3 className="shrink-0 text-[13px] font-semibold text-zinc-700">
            Этапы работ
          </h3>
          {inletStages.map((stage) => (
            <GlassCard key={stage.title} className="flex min-h-0 flex-1 flex-col p-3">
              <div className="mb-1 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D3DA00] text-[#111113]">
                  <stage.icon className="h-4 w-4" />
                </span>
                <h4 className="text-[14px] font-semibold text-zinc-900">
                  {stage.title}
                </h4>
              </div>
              <p className="text-[12px] leading-snug text-zinc-500 sm:text-[13px]">
                {stage.text}
              </p>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard className="mb-3 min-h-0 flex-1 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-[#111113]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-[13px] font-semibold">Важный нюанс</span>
          </div>
          <p className="text-[13px] leading-snug text-zinc-600 sm:text-[14px]">
            Если электрика уже собрана в старом исполнении, щиток будет ограничен
            существующей схемой и проводкой. Сделаем максимум в этих условиях и
            подскажем, что улучшить сейчас, а что заложить при ремонте.
          </p>
        </GlassCard>
      )}

      <div className="mt-3 shrink-0">
        <Button className="w-full" onClick={onInstall}>
          Заказать консультацию
        </Button>
      </div>
    </motion.section>
  );
}
