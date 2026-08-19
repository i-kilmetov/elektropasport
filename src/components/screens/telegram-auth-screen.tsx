"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export function TelegramAuthScreen({
  pendingAction,
  onBack,
}: {
  pendingAction?: "add-panel" | "no-panel" | "call-master" | "help-electrical";
  onBack: () => void;
}) {
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (pendingAction) {
      sessionStorage.setItem("ep_pending_auth_action", pendingAction);
    }
  }, [pendingAction]);

  const handleLogin = () => {
    setStarting(true);
    window.location.assign("/api/auth/telegram/start");
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">Вход</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <GlassCard className="w-full max-w-sm space-y-5 p-6 text-center">
          <BrandLogo className="mx-auto h-20" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2AABEE] text-white shadow-[0_8px_24px_rgba(42,171,238,0.28)]">
            <TelegramAppIcon className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-[22px] font-bold tracking-tight text-zinc-900">
              Войдите через Telegram
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
              Подтвердите вход в своём аккаунте Telegram — так мы сохраним ваши
              щитки, заявки и данные профиля.
            </p>
          </div>

          <Button className="w-full" disabled={starting} onClick={handleLogin}>
            {starting ? "Открываем Telegram…" : "Войти через Telegram"}
          </Button>
        </GlassCard>
      </div>

      <Button className="mt-6 w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
