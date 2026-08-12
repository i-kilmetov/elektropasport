"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getTelegramBotUsername,
  saveBrowserSession,
  type BrowserAuthUser,
} from "@/lib/client-auth";

type AuthSession = {
  pollToken: string;
  botUrl: string;
};

export function TelegramAuthScreen({
  title = "Войдите через Telegram",
  description = "Нажмите кнопку — откроется Telegram. Подтвердите вход и вернитесь на эту страницу.",
  onBack,
  onSuccess,
}: {
  title?: string;
  description?: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const botUsername = getTelegramBotUsername();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!botUsername) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/bot/start", { method: "POST" });
        const data = (await res.json()) as AuthSession & { error?: string };
        if (!res.ok) throw new Error(data.error || "Не удалось начать вход");
        if (!cancelled) setSession({ pollToken: data.pollToken, botUrl: data.botUrl });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось начать вход",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [botUsername, stopPolling]);

  const startPolling = useCallback(
    (pollToken: string) => {
      stopPolling();
      setWaiting(true);
      setError(null);

      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const res = await fetch(
              `/api/auth/bot/poll?token=${encodeURIComponent(pollToken)}`,
            );
            const data = (await res.json()) as {
              status?: "pending" | "complete";
              token?: string;
              user?: BrowserAuthUser;
              error?: string;
            };
            if (!res.ok) throw new Error(data.error || "Ошибка проверки входа");
            if (data.status === "complete" && data.token && data.user) {
              stopPolling();
              saveBrowserSession(data.token, data.user);
              setWaiting(false);
              onSuccess();
            }
          } catch (err) {
            stopPolling();
            setWaiting(false);
            setError(
              err instanceof Error ? err.message : "Не удалось войти",
            );
          }
        })();
      }, 2000);
    },
    [onSuccess, stopPolling],
  );

  const handleLogin = () => {
    if (!session) return;
    window.open(session.botUrl, "_blank", "noopener,noreferrer");
    startPolling(session.pollToken);
  };

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
            <Button
              className="w-full"
              disabled={!session || waiting}
              onClick={handleLogin}
            >
              {waiting ? "Ожидаем подтверждение…" : "Войти через Telegram"}
            </Button>
          ) : (
            <p className="text-[13px] text-amber-100/80">
              Вход через Telegram временно недоступен.
            </p>
          )}

          {error && (
            <p className="rounded-[14px] border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200">
              {error}
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
