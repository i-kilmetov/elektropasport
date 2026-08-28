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
import { ExpandableSection } from "@/components/ui/expandable-section";
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
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <header className="mb-4 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title">Сделать правильно</h1>
      </header>

      <div className="mb-4 flex shrink-0 items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#D3DA00] text-[#111113]">
          <BreakerIcon className="h-7 w-7" />
        </div>
        <h2 className="ty-heading">
          {isInletCable
            ? "С нуля можно сделать электрику правильно"
            : "Правильнее всего — собрать грамотный щиток"}
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        <ExpandableSection
          title="Цель"
          defaultOpen
          icon={<ShieldCheck className="h-4 w-4" />}
        >
          {isInletCable
            ? "Пока есть только вводной кабель, можно сразу заложить современную схему: трассы, щиток, защиту и запас под технику — без переделок после ремонта."
            : "Современный щиток с вводным автоматом, УЗО/дифавтоматами и раздельными линиями — надёжный способ сделать электрику безопасной и готовой к нагрузкам."}
        </ExpandableSection>

        {isInletCable ? (
          inletStages.map((stage, index) => (
            <ExpandableSection
              key={stage.title}
              title={stage.title}
              defaultOpen={index === 0}
              icon={<stage.icon className="h-4 w-4" />}
            >
              {stage.text}
            </ExpandableSection>
          ))
        ) : (
          <ExpandableSection
            title="Важный нюанс"
            defaultOpen
            icon={<AlertTriangle className="h-4 w-4" />}
          >
            Если электрика уже собрана в старом исполнении, щиток будет ограничен
            существующей схемой и проводкой. Сделаем максимум в этих условиях и
            подскажем, что улучшить сейчас, а что заложить при ремонте.
          </ExpandableSection>
        )}
      </div>

      <div className="shrink-0 pt-1">
        <Button className="w-full" onClick={onInstall}>
          Заказать консультацию
        </Button>
      </div>
    </motion.section>
  );
}
