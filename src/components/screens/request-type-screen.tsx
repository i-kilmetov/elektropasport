"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  CircuitBoard,
  Hammer,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export const requestNeedOptions = [
  {
    id: "consult",
    title: "Проконсультироваться",
    description: "Разобрать ситуацию и понять, что делать дальше",
    icon: MessageCircle,
  },
  {
    id: "design",
    title: "Спроектировать схему электрики в квартире/доме",
    description: "Подготовить понятную схему под ваш объект",
    icon: CircuitBoard,
  },
  {
    id: "assemble",
    title: "Собрать щиток",
    description: "Подобрать и собрать щиток под ваши задачи",
    icon: Wrench,
  },
  {
    id: "install",
    title: "Выполнить монтажные работы по электрике",
    description: "Монтаж и подключение на объекте",
    icon: Hammer,
  },
] as const;

export type RequestNeedId = (typeof requestNeedOptions)[number]["id"];

export function getRequestNeedTitle(id: RequestNeedId): string {
  return requestNeedOptions.find((option) => option.id === id)?.title ?? id;
}

export function RequestTypeScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (id: RequestNeedId) => void;
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
        <h1 className="text-[20px] font-semibold text-zinc-900">Новая заявка</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        Что вам нужно?
      </h2>
      <p className="mb-6 text-[15px] leading-relaxed text-zinc-500">
        Выберите задачу — после этого оставите телефон, и мы свяжемся.
      </p>

      <div className="flex flex-col gap-3">
        {requestNeedOptions.map((option, i) => {
          const Icon = option.icon;
          return (
            <motion.button
              key={option.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(option.id)}
              className="text-left"
            >
              <GlassCard className="flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold text-zinc-900">
                    {option.title}
                  </div>
                  <div className="mt-1 text-[13px] leading-snug text-zinc-500">
                    {option.description}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
              </GlassCard>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
