"use client";

import { useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Shield, Zap } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ONBOARDING_SKIP_KEY = "elektropasport:onboarding-skip";

const cards = [
  {
    icon: BreakerIcon,
    title: "Электропаспорт",
    text: "Сервис для цифрового паспорта щитка: схема, линии и история — всё под рукой.",
    accent: "#7c5cff",
    glow: "rgba(124, 92, 255, 0.22)",
    gradient:
      "radial-gradient(ellipse 80% 60% at 50% 18%, rgba(124,92,255,0.14), transparent 58%), linear-gradient(165deg, #ffffff 0%, #f7f7f8 100%)",
  },
  {
    icon: Shield,
    title: "Безопасность и помощь",
    text: "Покажем риски устаревшей схемы и поможем сделать электрику правильно — с щитком или без.",
    accent: "#10b981",
    glow: "rgba(16, 185, 129, 0.2)",
    gradient:
      "radial-gradient(ellipse 80% 60% at 50% 18%, rgba(16,185,129,0.12), transparent 58%), linear-gradient(165deg, #ffffff 0%, #f4faf7 100%)",
  },
  {
    icon: ArrowUpRight,
    title: "Готово к будущему",
    text: "Закладываем запас под рост нагрузок, умный дом и апгрейды — без полной переделки позже.",
    accent: "#0ea5e9",
    glow: "rgba(14, 165, 233, 0.2)",
    gradient:
      "radial-gradient(ellipse 80% 60% at 50% 18%, rgba(14,165,233,0.12), transparent 58%), linear-gradient(165deg, #ffffff 0%, #f3f9fc 100%)",
  },
] as const;

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
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh flex-col overflow-hidden px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
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
                i === index ? "w-7" : "w-1.5 bg-zinc-200",
              )}
              style={
                i === index
                  ? { backgroundColor: cards[i]!.accent }
                  : undefined
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish(true)}
          className="rounded-full px-2 py-1 text-[12px] font-medium tracking-wide text-zinc-500 transition-colors hover:text-zinc-600"
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
            className="relative flex flex-1 flex-col overflow-hidden rounded-[32px] border border-black/[0.06] bg-white shadow-[0_8px_32px_rgba(17,17,19,0.08)]"
            style={{ background: card.gradient }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl"
              style={{ background: card.glow }}
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full blur-3xl opacity-70"
              style={{ background: card.glow }}
            />

            <div className="relative flex flex-1 flex-col justify-between px-7 pb-8 pt-10">
              <div>
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="mb-10 flex h-[88px] w-[88px] items-center justify-center rounded-[28px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(17,17,19,0.04)]"
                  style={{
                    color: card.accent,
                    boxShadow: `0 12px 36px ${card.glow}`,
                  }}
                >
                  <Icon className="h-11 w-11" strokeWidth={1.75} />
                </motion.div>

                <div className="mb-3 flex items-center gap-2">
                  <Zap
                    className="h-3.5 w-3.5"
                    style={{ color: card.accent }}
                  />
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: card.accent }}
                  >
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(cards.length).padStart(2, "0")}
                  </span>
                </div>

                <h1 className="mb-4 max-w-[280px] text-[34px] font-bold leading-[1.1] tracking-tight text-zinc-900">
                  {card.title}
                </h1>
                <p className="max-w-[300px] text-[16px] leading-relaxed text-zinc-500">
                  {card.text}
                </p>
              </div>

              <div className="mt-10 flex items-center gap-2 text-zinc-400">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </button>

      <div className="relative z-10 mt-5 space-y-2">
        <Button
          className="w-full"
          size="lg"
          onClick={goNext}
          style={
            {
              ["--accent" as string]: card.accent,
              boxShadow: `0 10px 36px ${card.glow}`,
            } as CSSProperties
          }
        >
          {isLast ? "Начать" : "Далее"}
        </Button>
        {index > 0 ? (
          <button
            type="button"
            onClick={goPrev}
            className="w-full py-2.5 text-center text-[14px] font-medium text-zinc-500 transition-colors hover:text-zinc-600"
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
