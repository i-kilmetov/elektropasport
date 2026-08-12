"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getTelegramBotUsername,
  saveBrowserSession,
  type BrowserAuthUser,
} from "@/lib/client-auth";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

type TelegramWidgetUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export function TelegramAuthScreen({
  title = "Войдите через Telegram",
  description = "Чтобы сохранить щиток или заявку в вашем аккаунте, подтвердите вход через Telegram.",
  onBack,
  onSuccess,
}: {
  title?: string;
  description?: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const botUsername = getTelegramBotUsername();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!botUsername || !widgetRef.current) return;

    window.onTelegramAuth = async (user: TelegramWidgetUser) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const data = (await res.json()) as {
          token?: string;
          user?: BrowserAuthUser;
          error?: string;
        };
        if (!res.ok || !data.token || !data.user) {
          throw new Error(data.error || "Не удалось войти через Telegram");
        }
        saveBrowserSession(data.token, data.user);
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось войти через Telegram",
        );
      } finally {
        setLoading(false);
      }
    };

    const container = widgetRef.current;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "16");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      container.innerHTML = "";
    };
  }, [botUsername, onSuccess]);

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
        <h1 className="text-[20px] font-semibold text-white">Авторизация</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <GlassCard className="w-full max-w-sm space-y-5 p-6 text-center">
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/50">
              {description}
            </p>
          </div>

          {botUsername ? (
            <div className="flex min-h-[52px] flex-col items-center justify-center gap-3">
              <div ref={widgetRef} className="flex justify-center" />
              {loading && (
                <p className="text-[13px] text-white/45">Входим…</p>
              )}
              <div className="w-full space-y-2 text-left text-[12px] leading-relaxed text-white/45">
                <p>
                  После ввода номера откройте приложение{" "}
                  <strong className="font-medium text-white/70">Telegram</strong>{" "}
                  на телефоне — там придёт запрос на подтверждение входа.
                </p>
                <p>
                  Если сообщения нет, сначала откройте бота{" "}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--accent)] underline underline-offset-2"
                  >
                    @{botUsername}
                  </a>{" "}
                  и нажмите «Start», затем повторите вход.
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-[14px] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100/80">
              Не задан NEXT_PUBLIC_TELEGRAM_BOT_USERNAME — вход через Telegram
              недоступен в браузере.
            </p>
          )}

          {error && (
            <p className="rounded-[14px] border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200">
              {error}
            </p>
          )}

          <p className="text-[12px] leading-relaxed text-white/35">
            В Telegram Mini App вход происходит автоматически. В браузере мы
            используем официальный виджет Telegram Login.
          </p>
        </GlassCard>
      </div>

      <Button className="mt-6 w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
