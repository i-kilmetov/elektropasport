"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Gauge,
  Home,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { BreakerIcon } from "@/components/icons/breaker-icon";

const advantages = [
  {
    icon: ShieldCheck,
    title: "Безопасность семьи и дома",
    text: "Вводной автомат, УЗО/дифавтоматы и раздельные линии снижают риск поражения током и возгорания при перегрузке или повреждении проводки.",
  },
  {
    icon: Gauge,
    title: "Правильное распределение нагрузок",
    text: "Кухня, ванная, освещение и силовые розетки получают свои линии. Мощная техника не «сажает» всю квартиру.",
  },
  {
    icon: Home,
    title: "Понятный порядок и удобство",
    text: "В щитке видно, что за что отвечает. Можно быстро обесточить одну линию без отключения всего дома.",
  },
  {
    icon: Wifi,
    title: "Готовность к умному дому",
    text: "Современный щит легко расширяется: реле, модули Wi‑Fi/Zigbee, сценарии включения, удалённый контроль и уведомления об авариях.",
  },
  {
    icon: Sparkles,
    title: "Апгрейд в будущем",
    text: "Позже можно добавить анализ расхода энергии, мониторинг напряжения, умные автоматы и интеграцию с умным домом — без полной переделки проводки.",
  },
];

export function PanelAdvantagesScreen({
  onBack,
  onInstall,
}: {
  onBack: () => void;
  onInstall: () => void;
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
        <h1 className="text-[20px] font-semibold text-white">Как исправить?</h1>
      </header>

      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-[var(--accent)]/15 text-[var(--accent)]">
          <BreakerIcon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-[20px] font-bold leading-snug text-white">
            Лучшее решение — современный щиток
          </h2>
        </div>
      </div>

      <GlassCard className="mb-4 p-4">
        <p className="text-[14px] leading-relaxed text-white/65">
          Самый надёжный способ исправить текущую схему — установить современный
          электрощиток с автоматами и защитой. Это безопаснее для людей, снижает
          риск пожара и даёт запас для роста нагрузки и будущих апгрейдов.
        </p>
      </GlassCard>

      <h3 className="mb-3 text-[15px] font-semibold text-white/80">
        Основные преимущества
      </h3>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {advantages.map((item) => (
          <GlassCard key={item.title} className="p-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                <item.icon className="h-4 w-4" />
              </span>
              <h3 className="text-[15px] font-semibold text-white">
                {item.title}
              </h3>
            </div>
            <p className="text-[14px] leading-relaxed text-white/55">
              {item.text}
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-auto pt-2">
        <Button className="w-full" size="lg" onClick={onInstall}>
          Установить щиток
        </Button>
      </div>
    </motion.section>
  );
}
