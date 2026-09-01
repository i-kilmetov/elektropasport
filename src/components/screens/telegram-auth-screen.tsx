"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PhoneLoginFlow } from "@/components/phone-login-flow";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export function TelegramAuthScreen({
  pendingAction,
  onBack,
  minimal = false,
  returnTo,
}: {
  pendingAction?: "add-panel" | "no-panel" | "call-master" | "help-electrical";
  onBack?: () => void;
  minimal?: boolean;
  returnTo?: string;
}) {
  useEffect(() => {
    if (pendingAction) {
      sessionStorage.setItem("ep_pending_auth_action", pendingAction);
    }
  }, [pendingAction]);

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className={
        minimal
          ? "flex min-h-dvh flex-col items-center justify-center px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
          : "flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
      }
    >
      {!minimal && (
        <header className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="ty-title">Вход</h1>
        </header>
      )}

      <div
        className={
          minimal
            ? "flex w-full flex-col items-center justify-center"
            : "flex flex-1 flex-col items-center justify-center"
        }
      >
        <GlassCard className="w-full max-w-sm space-y-5 p-6 text-center">
          <BrandLogo className="mx-auto h-10" />
          <div>
            <h2 className="ty-title text-zinc-900">Войдите в Током</h2>
            <p className="mt-2 ty-body">
              Подтвердите номер телефона кодом из Telegram — так мы сохраним
              ваши щитки, заявки и данные профиля.
            </p>
          </div>

          <PhoneLoginFlow returnTo={returnTo} />
        </GlassCard>
      </div>

      {!minimal && onBack && (
        <Button className="mt-6 w-full" variant="secondary" onClick={onBack}>
          Назад
        </Button>
      )}
    </motion.section>
  );
}
