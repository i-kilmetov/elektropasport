"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Home, Shield, Sparkles } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ONBOARDING_SKIP_KEY = "elektropasport:onboarding-skip";

const cards = [
  {
    icon: BreakerIcon,
    title: "Электропаспорт",
    text: "Создайте цифровой паспорт электрощитка — схема, линии и история в одном месте.",
  },
  {
    icon: Camera,
    title: "Сфотографируйте щиток",
    text: "Распознаем автоматы, УЗО и реле, соберём понятную интерактивную схему.",
  },
  {
    icon: Home,
    title: "Поймите свою электрику",
    text: "Подпишите линии комнатами и всегда знайте, что за что отвечает в щитке.",
  },
  {
    icon: Shield,
    title: "Безопасность и помощь",
    text: "Если щитка нет или схема устарела — подскажем риски и поможем сделать правильно.",
  },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = index === cards.length - 1;
  const card = cards[index]!;
  const Icon = card.icon;

  const finish = (skipForever: boolean) => {
    if (skipForever) {
      try {
        localStorage.setItem(ONBOARDING_SKIP_KEY, "1");
      } catch {
        // private mode
      }
    }
    onStart();
  };

  const goNext = () => {
    if (isLast) {
      finish(false);
      return;
    }
    setDirection(1);
    setIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (index === 0) return;
    setDirection(-1);
    setIndex((i) => i - 1);
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--accent)]/20 blur-[90px]" />
        <div className="absolute bottom-28 right-0 h-48 w-48 rounded-full bg-violet-700/15 blur-[80px]" />
      </div>

      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {cards.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index
                  ? "w-6 bg-[var(--accent)]"
                  : "w-1.5 bg-white/20",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish(true)}
          className="text-[13px] font-medium text-white/45 transition-colors hover:text-white/75"
        >
          Не показывать больше
        </button>
      </div>

      <button
        type="button"
        onClick={goNext}
        className="relative z-10 flex min-h-0 flex-1 flex-col"
        aria-label={isLast ? "Начать" : "Следующая карточка"}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={card.title}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28 }}
            className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.05] px-6 py-10 text-center backdrop-blur-xl"
          >
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/15 bg-[var(--accent)]/15 text-[var(--accent)]">
              <Icon className="h-10 w-10" />
            </div>
            {index === 0 && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/55">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                Добро пожаловать
              </div>
            )}
            <h1 className="mb-3 text-[28px] font-bold tracking-tight text-white">
              {card.title}
            </h1>
            <p className="max-w-[300px] text-[16px] leading-relaxed text-white/55">
              {card.text}
            </p>
            <p className="mt-10 text-[13px] text-white/35">
              {isLast ? "Нажмите, чтобы начать" : "Нажмите, чтобы продолжить"}
            </p>
          </motion.div>
        </AnimatePresence>
      </button>

      <div className="relative z-10 mt-5 space-y-3">
        <Button className="w-full" size="lg" onClick={goNext}>
          {isLast ? "Начать" : "Далее"}
        </Button>
        {index > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="w-full py-2 text-center text-[14px] font-medium text-white/45 transition-colors hover:text-white/75"
          >
            Назад
          </button>
        )}
      </div>
    </motion.section>
  );
}
