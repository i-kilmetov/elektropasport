"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getTelegramBotUsername } from "@/lib/client-auth";

export function TelegramAuthScreen({
  pendingAction,
  onBack,
}: {
  pendingAction?: "add-panel" | "no-panel";
  onBack: () => void;
}) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const botUsername = getTelegramBotUsername();

  useEffect(() => {
    if (pendingAction) {
      sessionStorage.setItem("ep_pending_auth_action", pendingAction);
    }
  }, [pendingAction]);

  useEffect(() => {
    if (!botUsername || !widgetRef.current) return;

    const origin = window.location.origin;
    const container = widgetRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "16");
    script.setAttribute(
      "data-auth-url",
      `${origin}/auth/telegram/callback`,
    );
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [botUsername]);

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
        <h1 className="text-[20px] font-semibold text-white">Вход</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <GlassCard className="w-full max-w-sm space-y-5 p-6 text-center">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-white">
              Войдите через Telegram
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/50">
              Используйте свой аккаунт Telegram, чтобы сохранять щитки и заявки.
            </p>
          </div>

          {botUsername ? (
            <div ref={widgetRef} className="flex min-h-[52px] justify-center" />
          ) : (
            <p className="text-[13px] text-amber-100/80">
              Вход через Telegram временно недоступен.
            </p>
          )}
        </GlassCard>
      </div>

      <Button className="mt-6 w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
