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
  title: string;
  text: string;
  kind: "brand" | "photo" | "auth";
  image?: string;
};

const cards: Card[] = [
  {
    id: "brand",
    title: "Током",
    text: "Самодиагностика и помощь в электрике",
    kind: "brand",
  },
  {
    id: "safety",
    title: "Безопасность и помощь",
    text: "Покажем риски устаревшей схемы и поможем сделать электрику правильно — с щитком или без.",
    kind: "photo",
    image: "/onboarding/safety.jpg",
  },
  {
    id: "future",
    title: "Готово к будущему",
    text: "Закладываем запас под рост нагрузок, умный дом и апгрейды — без полной переделки позже.",
    kind: "photo",
    image: "/onboarding/future.jpg",
  },
  {
    id: "auth",
    title: "Начните с входа",
    text: "Войдите через Telegram, чтобы сохранить щитки, заявки и данные профиля.",
    kind: "auth",
  },
];

export function WelcomeScreen({
  onStart,
  onTelegramLogin,
}: {
  onStart: () => void;
  onTelegramLogin?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [startingLogin, setStartingLogin] = useState(false);
  const isLast = index === cards.length - 1;
  const card = cards[index]!;
  const alreadyAuthed = canUseServerAuth() || isTelegramMiniApp();

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

  const startTelegramLogin = () => {
    if (alreadyAuthed) {
      finish(false);
      return;
    }
    setStartingLogin(true);
    if (onTelegramLogin) {
      onTelegramLogin();
      return;
    }
    window.location.assign("/api/auth/telegram/start");
  };

  const goNext = () => {
    if (isLast) {
      if (card.kind === "auth") {
        startTelegramLogin();
        return;
      }
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
      className="relative flex min-h-dvh flex-col overflow-hidden bg-black px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-white lg:h-[var(--app-height,100dvh)] lg:px-16 lg:py-10"
    >
      <div className="relative z-10 mb-5 flex items-center justify-between gap-3 lg:mx-auto lg:mb-8 lg:w-full lg:max-w-6xl">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-8 lg:h-10" onDark />
          <div className="flex items-center gap-1.5">
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
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-7 bg-white" : "w-1.5 bg-white/25",
                )}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => finish(true)}
          className="rounded-full px-2 py-1 text-[12px] font-medium tracking-wide text-white/45 transition-colors hover:text-white/70"
        >
          Не показывать больше
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-16">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={card.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 56, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -56, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative flex min-h-0 flex-1 flex-col lg:contents"
          >
            <div className="min-h-0 flex-1 overflow-hidden rounded-[32px] lg:h-[min(68vh,720px)] lg:flex-none">
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                className="relative flex h-full flex-col"
                style={{
                  backgroundColor:
                    card.kind === "brand" || card.kind === "auth"
                      ? BRAND_YELLOW
                      : "#000",
                }}
              >
                {card.kind === "brand" && (
                  <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
                    <BrandLogo className="h-12 w-[min(72%,280px)] sm:h-14" />
                    <p className="max-w-[280px] text-[17px] font-semibold leading-snug text-zinc-950 lg:text-[20px]">
                      Самодиагностика и помощь в электрике
                    </p>
                  </div>
                )}
                {card.kind === "photo" && card.image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div
                      className="absolute left-4 top-4 rounded-[12px] px-3 py-2"
                      style={{ backgroundColor: BRAND_YELLOW }}
                    >
                      <BrandLogo className="h-7" />
                    </div>
                  </>
                )}
                {card.kind === "auth" && (
                  <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
                    <BrandLogo className="h-12 w-[min(72%,280px)] sm:h-14" />
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2AABEE] text-white shadow-[0_8px_24px_rgba(42,171,238,0.28)]">
                      <TelegramAppIcon className="h-8 w-8" />
                    </div>
                    <p className="max-w-[280px] text-[16px] font-semibold leading-snug text-zinc-950">
                      Войдите через Telegram, чтобы сохранить данные
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="flex shrink-0 flex-col pt-7 lg:pt-0">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(cards.length).padStart(2, "0")}
              </div>
              <h1 className="mb-3 max-w-[300px] text-[32px] font-bold leading-[1.1] tracking-tight text-white lg:max-w-none lg:text-[48px]">
                {card.title}
              </h1>
              <p className="max-w-[320px] text-[15px] leading-relaxed text-white/55 lg:max-w-md lg:text-[17px]">
                {card.text}
              </p>
              <div className="mt-8 hidden max-w-sm space-y-2 lg:block">
                {card.kind === "auth" ? (
                  <Button
                    className="w-full bg-[#2AABEE] text-white shadow-none hover:bg-[#229ED9]"
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
                    className="w-full bg-white text-zinc-900 shadow-none hover:bg-zinc-100"
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
                    className="w-full py-2.5 text-center text-[14px] font-medium text-white/45 transition-colors hover:text-white/70"
                  >
                    Назад
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-5 space-y-2 lg:hidden">
        {card.kind === "auth" ? (
          <Button
            className="w-full bg-[#2AABEE] text-white shadow-none hover:bg-[#229ED9]"
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
            className="w-full bg-white text-zinc-900 shadow-none hover:bg-zinc-100"
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
