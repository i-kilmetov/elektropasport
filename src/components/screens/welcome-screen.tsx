"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo, BRAND_YELLOW } from "@/components/brand-logo";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { canUseServerAuth, isTelegramMiniApp } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

export const ONBOARDING_SKIP_KEY = "elektropasport:onboarding-skip";

type Card = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  image?: string;
  imageAlt: string;
  cta: "next" | "telegram";
};

/** Copy and layout follow Figma «Током» onboarding frames (auto-layout cards). */
const cards: Card[] = [
  {
    id: "diag",
    eyebrow: "Проверь себя",
    title: "Самодиагностика электрики",
    text: "Сфотографируйте щиток или ответьте на вопросы — Током покажет риски и что сделать дальше: своими руками или с мастером.",
    image: "/onboarding/safety.jpg",
    imageAlt: "Диагностика электрики",
    cta: "next",
  },
  {
    id: "everyone",
    eyebrow: "Проверь себя",
    title: "Справится каждый",
    text: "Никаких сложных формул и формулировок. Понятные иллюстрированные инструкции помогут любому человеку — от школьника до домохозяйки — легко пройти тест и оценить риски.",
    image: "/onboarding/future.jpg",
    imageAlt: "Простая самопроверка",
    cta: "next",
  },
  {
    id: "master",
    eyebrow: "Проверь себя",
    title: "Консультация и мастер",
    text: "Если тест обнаружит критические проблемы, вы сможете моментально проконсультироваться со специалистом или вызвать проверенного электрика в один клик.",
    image: "/onboarding/passport.jpg",
    imageAlt: "Мастер-электрик",
    cta: "next",
  },
  {
    id: "auth",
    eyebrow: "Проверь себя",
    title: "Авторизация через Telegram",
    text: "Войдите через Telegram, чтобы сохранить щитки, заявки и данные профиля — и продолжить с любого устройства.",
    imageAlt: "Вход через Telegram",
    cta: "telegram",
  },
];

export function WelcomeScreen({
  onContinue,
  onTelegramLogin,
}: {
  /** Called when onboarding is done and the user is already authenticated. */
  onContinue: () => void;
  /** Start Telegram login (unauthenticated users). */
  onTelegramLogin: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [startingLogin, setStartingLogin] = useState(false);
  const isLast = index === cards.length - 1;
  const card = cards[index]!;
  const alreadyAuthed = canUseServerAuth() || isTelegramMiniApp();

  const rememberOnboardingSeen = () => {
    try {
      localStorage.setItem(ONBOARDING_SKIP_KEY, "1");
    } catch {
      // private mode
    }
  };

  const startTelegramLogin = () => {
    rememberOnboardingSeen();
    if (alreadyAuthed) {
      onContinue();
      return;
    }
    setStartingLogin(true);
    onTelegramLogin();
  };

  const goNext = () => {
    if (isLast) {
      startTelegramLogin();
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
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-white"
    >
      <button
        type="button"
        onClick={() => {
          rememberOnboardingSeen();
          if (alreadyAuthed) onContinue();
          else startTelegramLogin();
        }}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 rounded-full px-3 py-1.5 text-[12px] font-medium tracking-wide text-white/40 transition-colors hover:text-white/70"
      >
        Войти
      </button>

      <div className="relative z-10 flex w-full max-w-[400px] flex-1 flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.article
            key={card.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -48 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="flex min-h-[min(720px,calc(100dvh-2rem))] flex-col rounded-[28px] bg-[#111] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:min-h-[640px] sm:p-6"
          >
            <header className="mb-4 shrink-0 text-center">
              <p
                className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: BRAND_YELLOW }}
              >
                {card.eyebrow}
              </p>
              <BrandLogo className="mx-auto h-8 sm:h-9" onDark />
            </header>

            <div className="relative mb-5 min-h-0 flex-1 overflow-hidden rounded-[22px] bg-zinc-900">
              {card.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.image}
                  alt={card.imageAlt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full min-h-[220px] flex-col items-center justify-center gap-5 px-6"
                  style={{ backgroundColor: BRAND_YELLOW }}
                >
                  <BrandLogo className="h-10 w-[min(70%,240px)]" />
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2AABEE] text-white shadow-[0_8px_24px_rgba(42,171,238,0.28)]">
                    <TelegramAppIcon className="h-8 w-8" />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <h1 className="mb-2.5 text-[26px] font-bold leading-[1.15] tracking-tight text-white sm:text-[28px]">
                {card.title}
              </h1>
              <p className="mb-6 text-[14px] leading-relaxed text-white/55 sm:text-[15px]">
                {card.text}
              </p>

              <div className="mb-5 flex items-center justify-center gap-2">
                {cards.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Карточка ${i + 1}`}
                    onClick={() => {
                      setDirection(i > index ? 1 : -1);
                      setIndex(i);
                    }}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === index
                        ? "w-6"
                        : "w-2 bg-white/20 hover:bg-white/35",
                    )}
                    style={
                      i === index ? { backgroundColor: BRAND_YELLOW } : undefined
                    }
                  />
                ))}
              </div>

              {card.cta === "telegram" ? (
                <Button
                  className="w-full text-zinc-950 shadow-none hover:brightness-95"
                  style={{ backgroundColor: BRAND_YELLOW }}
                  size="lg"
                  disabled={startingLogin}
                  onClick={startTelegramLogin}
                >
                  <TelegramAppIcon className="h-5 w-5" />
                  {startingLogin
                    ? "Открываем Telegram…"
                    : alreadyAuthed
                      ? "Начать"
                      : "Войти через Telegram"}
                </Button>
              ) : (
                <Button
                  className="w-full text-zinc-950 shadow-none hover:brightness-95"
                  style={{ backgroundColor: BRAND_YELLOW }}
                  size="lg"
                  onClick={goNext}
                >
                  Далее
                </Button>
              )}

              {index > 0 ? (
                <button
                  type="button"
                  onClick={goPrev}
                  className="mt-2 w-full py-2.5 text-center text-[14px] font-medium text-white/40 transition-colors hover:text-white/65"
                >
                  Назад
                </button>
              ) : (
                <div className="mt-2 h-[42px]" />
              )}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
