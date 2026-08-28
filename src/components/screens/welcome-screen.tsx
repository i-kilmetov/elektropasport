"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo, BRAND_YELLOW } from "@/components/brand-logo";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { canUseServerAuth, isTelegramMiniApp } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

export const ONBOARDING_SKIP_KEY = "elektropasport:onboarding-skip";

type ContentCard = {
  id: string;
  kind: "content";
  eyebrow: string;
  title: string;
  text: string;
};

type AuthCard = {
  id: string;
  kind: "auth";
};

type Card = ContentCard | AuthCard;

const cards: Card[] = [
  {
    id: "diag",
    kind: "content",
    eyebrow: "Проверь себя",
    title: "Самодиагностика электрики",
    text: "Сфотографируйте щиток или ответьте на вопросы — Током покажет риски и что сделать дальше: своими руками или с мастером.",
  },
  {
    id: "everyone",
    kind: "content",
    eyebrow: "Проверь себя",
    title: "Справится каждый",
    text: "Никаких сложных формул и формулировок. Понятные иллюстрированные инструкции помогут любому человеку — от школьника до домохозяйки — легко пройти тест и оценить риски.",
  },
  {
    id: "master",
    kind: "content",
    eyebrow: "Проверь себя",
    title: "Консультация и мастер",
    text: "Если тест обнаружит критические проблемы, вы сможете моментально проконсультироваться со специалистом или вызвать проверенного электрика в один клик.",
  },
  {
    id: "auth",
    kind: "auth",
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

  const dots = (
    <div className="flex items-center justify-center gap-2">
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
            i === index ? "w-6" : "w-2",
            card.kind === "auth"
              ? i === index
                ? "bg-zinc-950"
                : "bg-zinc-950/25 hover:bg-zinc-950/40"
              : i === index
                ? ""
                : "bg-white/20 hover:bg-white/35",
          )}
          style={
            card.kind === "content" && i === index
              ? { backgroundColor: BRAND_YELLOW }
              : undefined
          }
        />
      ))}
    </div>
  );

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
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 rounded-full px-3 py-1.5 ty-badge tracking-wide text-white/40 transition-colors hover:text-white/70"
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
            className={cn(
              "flex min-h-[min(720px,calc(100dvh-2rem))] flex-col rounded-[28px] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:min-h-[640px] sm:p-6",
              card.kind === "auth" ? "text-zinc-950" : "bg-[#111] text-white",
            )}
            style={
              card.kind === "auth" ? { backgroundColor: BRAND_YELLOW } : undefined
            }
          >
            {card.kind === "auth" ? (
              <>
                <header className="shrink-0 pt-2 text-center">
                  <p className="ty-kicker text-zinc-950">
                    Проверь себя
                  </p>
                </header>

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2">
                  <BrandLogo className="h-14 w-[min(88%,320px)] sm:h-16" />
                </div>

                <div className="shrink-0 space-y-5">
                  {dots}
                  <Button
                    className="w-full bg-zinc-950 text-white shadow-none hover:bg-zinc-800"
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
                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="w-full py-2.5 text-center ty-subtitle text-zinc-950/45 transition-colors hover:text-zinc-950/70"
                    >
                      Назад
                    </button>
                  ) : (
                    <div className="h-[42px]" />
                  )}
                </div>
              </>
            ) : (
              <>
                <header className="mb-4 shrink-0 text-center">
                  <p
                    className="mb-1.5 ty-kicker"
                    style={{ color: BRAND_YELLOW }}
                  >
                    {card.eyebrow}
                  </p>
                  <BrandLogo className="mx-auto h-8 sm:h-9" onDark />
                </header>

                <div className="relative mb-5 min-h-0 flex-1 overflow-hidden rounded-[22px] bg-black" />

                <div className="shrink-0">
                  <h1 className="mb-2.5 ty-display text-white ">
                    {card.title}
                  </h1>
                  <p className="mb-6 ty-body text-white/55 ">
                    {card.text}
                  </p>

                  <div className="mb-5">{dots}</div>

                  <Button
                    className="w-full text-zinc-950 shadow-none hover:brightness-95"
                    style={{ backgroundColor: BRAND_YELLOW }}
                    size="lg"
                    onClick={goNext}
                  >
                    Далее
                  </Button>

                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="mt-2 w-full py-2.5 text-center ty-subtitle text-white/40 transition-colors hover:text-white/65"
                    >
                      Назад
                    </button>
                  ) : (
                    <div className="mt-2 h-[42px]" />
                  )}
                </div>
              </>
            )}
          </motion.article>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
