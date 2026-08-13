"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ONBOARDING_SKIP_KEY = "elektropasport:onboarding-skip";

const cards = [
  {
    image: "/onboarding/passport.jpg",
    title: "Электропаспорт",
    text: "Сервис для цифрового паспорта щитка: схема, линии и история — всё под рукой.",
  },
  {
    image: "/onboarding/safety.jpg",
    title: "Безопасность и помощь",
    text: "Покажем риски устаревшей схемы и поможем сделать электрику правильно — с щитком или без.",
  },
  {
    image: "/onboarding/future.jpg",
    title: "Готово к будущему",
    text: "Закладываем запас под рост нагрузок, умный дом и апгрейды — без полной переделки позже.",
  },
] as const;

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = index === cards.length - 1;
  const card = cards[index]!;

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
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh flex-col overflow-hidden bg-black px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-white"
    >
      <div className="relative z-10 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {cards.map((item, i) => (
            <button
              key={item.title}
              type="button"
              aria-label={`Карточка ${i + 1}`}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-white" : "w-1.5 bg-white/25",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish(true)}
          className="rounded-full px-2 py-1 text-[12px] font-medium tracking-wide text-white/45 transition-colors hover:text-white/70"
        >
          Не показывать больше
        </button>
      </div>

      <button
        type="button"
        onClick={goNext}
        className="relative z-10 flex min-h-0 flex-1 flex-col text-left"
        aria-label={isLast ? "Начать" : "Следующая карточка"}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={card.title}
            custom={direction}
            initial={{ opacity: 0, x: direction * 56, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -56, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative flex min-h-0 flex-1 flex-col"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="min-h-0 flex-1 overflow-hidden rounded-[32px]"
            >
              <img
                src={card.image}
                alt=""
                className="h-full w-full object-cover"
              />
            </motion.div>

            <div className="shrink-0 pt-7">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(cards.length).padStart(2, "0")}
              </div>
              <h1 className="mb-3 max-w-[300px] text-[32px] font-bold leading-[1.1] tracking-tight text-white">
                {card.title}
              </h1>
              <p className="max-w-[320px] text-[15px] leading-relaxed text-white/55">
                {card.text}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </button>

      <div className="relative z-10 mt-5 space-y-2">
        <Button
          className="w-full bg-white text-zinc-900 shadow-none hover:bg-zinc-100"
          size="lg"
          onClick={goNext}
        >
          {isLast ? "Начать" : "Далее"}
        </Button>
        {index > 0 ? (
          <button
            type="button"
            onClick={goPrev}
            className="w-full py-2.5 text-center text-[14px] font-medium text-white/45 transition-colors hover:text-white/70"
          >
            Назад
          </button>
        ) : (
          <div className="h-[42px]" />
        )}
      </div>
    </motion.section>
  );
}
