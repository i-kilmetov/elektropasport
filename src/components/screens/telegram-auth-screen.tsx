"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { PdConsentCheckbox } from "@/components/ui/pd-consent-checkbox";
import { beginTelegramLogin } from "@/lib/pd-consent-client";
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
  const [starting, setStarting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingAction) {
      sessionStorage.setItem("ep_pending_auth_action", pendingAction);
    }
  }, [pendingAction]);

  const handleLogin = () => {
    if (!consent) return;
    setLoginError(null);
    setStarting(true);
    void beginTelegramLogin(returnTo).catch((error) => {
      setStarting(false);
      setLoginError(
        error instanceof Error ? error.message : "Не удалось начать вход",
      );
    });
  };

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
          <h1 className="text-[20px] font-semibold text-zinc-900">Вход</h1>
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
            <h2 className="text-[22px] font-bold tracking-tight text-zinc-900">
              Войдите через Telegram
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
              Подтвердите вход в своём аккаунте Telegram — так мы сохраним ваши
              щитки, заявки и данные профиля.
            </p>
          </div>

          <Button
            className="w-full gap-2"
            disabled={starting || !consent}
            onClick={handleLogin}
          >
            {starting ? (
              "Открываем Telegram…"
            ) : (
              <>
                <TelegramAppIcon className="h-5 w-5 text-current" />
                Войти через Telegram
              </>
            )}
          </Button>

          <PdConsentCheckbox
            checked={consent}
            onChange={setConsent}
            className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-black/8 bg-zinc-50 p-3 text-left"
          />
          {loginError && (
            <p className="text-[13px] text-red-600">{loginError}</p>
          )}
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
