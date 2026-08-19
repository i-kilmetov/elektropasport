"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  Hammer,
  Headphones,
  MapPin,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

const workTypes = [
  {
    icon: MessageCircle,
    title: "Консультации онлайн",
    text: "Разбираем ситуацию по схеме щитка, фото и описанию — в чате или по телефону.",
    accent: "text-sky-600 bg-sky-500/10",
  },
  {
    icon: Headphones,
    title: "Поддержка по телефону",
    text: "Помогаете пользователю понять, что происходит в щитке и что делать дальше.",
    accent: "text-violet-600 bg-violet-500/10",
  },
  {
    icon: MapPin,
    title: "Выезд по заявке",
    text: "Оценка текущего состояния, схемы электрики, прозвонка линий и рекомендации на объекте.",
    accent: "text-amber-600 bg-amber-500/10",
  },
  {
    icon: Wrench,
    title: "Сборка щитков",
    text: "Подбор и сборка щитка под задачи объекта — от квартиры до частного дома.",
    accent: "text-emerald-600 bg-emerald-500/10",
  },
  {
    icon: Hammer,
    title: "Монтаж и подключение",
    text: "Установка щитка, прокладка линий, замена автоматов, УЗО и других устройств.",
    accent: "text-orange-600 bg-orange-500/10",
  },
] as const;

const steps = [
  "Укажете город, где готовы работать",
  "Коротко расскажете о себе и опыте",
  "Оставите телефон или Telegram для связи",
  "Мы свяжемся и обсудим формат сотрудничества",
] as const;

export function BecomeMasterScreen({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: () => void;
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">Стать мастером</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <GlassCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 px-5 py-6 text-white">
            <BrandLogo className="mb-4 h-16 rounded-[14px]" />
            <h2 className="text-[24px] font-bold tracking-tight">
              Присоединяйтесь к команде Щиттока
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
              Мы ищем сильных специалистов, которые аккуратно работают с
              электрикой, умеют объяснять простым языком и отвечают за результат.
              У нас есть реальные задачи — от консультаций до выезда и монтажа.
            </p>
          </div>
        </GlassCard>

        <div>
          <h3 className="mb-3 text-[15px] font-semibold text-zinc-900">
            Какие задачи бывают
          </h3>
          <div className="space-y-3">
            {workTypes.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <GlassCard className="flex gap-3 p-4">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
                      item.accent,
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-zinc-900">
                      {item.title}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                      {item.text}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>

        <GlassCard className="flex gap-3 border-amber-500/20 bg-amber-500/[0.05] p-4">
          <span className="mt-0.5 text-amber-600">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <div className="mb-1 text-[15px] font-semibold text-zinc-900">
              Обязательное условие
            </div>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Профильное образование и подтверждённая квалификация. Без этого мы
              не подключаем мастеров к заявкам сервиса — это вопрос безопасности
              пользователей.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3 p-4">
          <h3 className="text-[15px] font-semibold text-zinc-900">
            Как подать заявку
          </h3>
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 text-[14px] leading-relaxed text-zinc-500"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[12px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </GlassCard>
      </div>

      <div className="mt-auto space-y-3 pt-2">
        <Button className="w-full" size="lg" onClick={onConfirm}>
          Отправить заявку
        </Button>
        <Button className="w-full" variant="secondary" onClick={onBack}>
          Не сейчас
        </Button>
      </div>
    </motion.section>
  );
}
