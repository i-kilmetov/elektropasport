"use client";

import { useEffect, useMemo, useState } from "react";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { beginTelegramLogin } from "@/lib/pd-consent-client";
import {
  fetchBrowserLoginEnabled,
  startPhoneLogin,
  verifyPhoneLogin,
  completeBrowserLogin,
} from "@/lib/phone-auth-client";
import { formatPhoneDigits } from "@/lib/user-profile";
import { cn } from "@/lib/utils";

const PHONE_PREFIX = "+7";

function ruNationalDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.startsWith("7")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function formatRuPhone(value: string): string {
  const national = ruNationalDigits(value);
  if (!national) return `${PHONE_PREFIX} `;
  let formatted = `${PHONE_PREFIX} ${national.slice(0, 3)}`;
  if (national.length > 3) formatted += ` ${national.slice(3, 6)}`;
  if (national.length > 6) formatted += `-${national.slice(6, 8)}`;
  if (national.length > 8) formatted += `-${national.slice(8, 10)}`;
  return formatted;
}

type Step = "phone" | "code";

export function PhoneLoginFlow({
  returnTo,
  variant = "card",
  className,
  onBeforeLogin,
}: {
  returnTo?: string;
  variant?: "splash" | "card";
  className?: string;
  onBeforeLogin?: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(`${PHONE_PREFIX} `);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchBrowserLoginEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const phoneDigits = useMemo(() => ruNationalDigits(phone), [phone]);
  const phoneValid = phoneDigits.length === 10;
  const codeValid = /^\d{4,8}$/.test(code.trim());
  const isSplash = variant === "splash";

  const handleTelegramLogin = () => {
    setError(null);
    onBeforeLogin?.();
    setBusy(true);
    void beginTelegramLogin(returnTo).catch((err) => {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Не удалось начать вход");
    });
  };

  const handleSendCode = async () => {
    if (!phoneValid || busy) return;
    setError(null);
    setBusy(true);
    onBeforeLogin?.();
    try {
      const result = await startPhoneLogin(phone);
      setChallengeId(result.challengeId);
      setStep("code");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!challengeId || !codeValid || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { token, user } = await verifyPhoneLogin({
        challengeId,
        code: code.trim(),
      });
      completeBrowserLogin(token, user, returnTo);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Не удалось подтвердить код");
    }
  };

  if (enabled === null) {
    return (
      <div className={cn("space-y-3", className)}>
        <Button className="w-full" disabled>
          Загрузка…
        </Button>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className={cn("space-y-3", className)}>
        <Button
          type="button"
          className={cn(
            "w-full gap-2",
            isSplash &&
              "h-14 min-h-14 rounded-full bg-[#111113] px-6 text-[16px] text-white hover:bg-zinc-800",
          )}
          disabled={busy}
          onClick={handleTelegramLogin}
        >
          <TelegramAppIcon className="h-5 w-5 shrink-0 text-current" />
          {busy ? "Открываем Telegram…" : "Войти через Telegram"}
        </Button>
        {error && (
          <p className="text-center text-[13px] text-red-600">{error}</p>
        )}
      </div>
    );
  }

  if (step === "phone") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="space-y-2 text-left">
          <label className="ty-caption text-zinc-600" htmlFor="phone-login">
            Телефон
          </label>
          <input
            id="phone-login"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(formatRuPhone(event.target.value))}
            placeholder="+7 900 123-45-67"
            className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[16px] text-zinc-900 outline-none focus:border-zinc-400"
          />
          <p className="ty-caption text-zinc-500">
            Отправим код подтверждения в Telegram на номер{" "}
            {phoneValid ? formatPhoneDigits(phoneDigits) : "…"}
          </p>
        </div>
        <Button
          type="button"
          className={cn(
            "w-full",
            isSplash &&
              "h-14 min-h-14 rounded-full bg-[#111113] px-6 text-[16px] text-white hover:bg-zinc-800",
          )}
          disabled={!phoneValid || busy}
          onClick={() => void handleSendCode()}
        >
          {busy ? "Отправляем код…" : "Получить код"}
        </Button>
        {error && (
          <p className="text-center text-[13px] text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2 text-left">
        <p className="ty-body text-zinc-700">
          Код отправлен на {formatPhoneDigits(phoneDigits)}
        </p>
        <label className="ty-caption text-zinc-600" htmlFor="phone-code">
          Код из Telegram
        </label>
        <input
          id="phone-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
          }
          placeholder="123456"
          className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-center text-[20px] tracking-[0.2em] text-zinc-900 outline-none focus:border-zinc-400"
        />
      </div>
      <Button
        type="button"
        className={cn(
          "w-full",
          isSplash &&
            "h-14 min-h-14 rounded-full bg-[#111113] px-6 text-[16px] text-white hover:bg-zinc-800",
        )}
        disabled={!codeValid || busy}
        onClick={() => void handleVerify()}
      >
        {busy ? "Проверяем…" : "Войти"}
      </Button>
      <button
        type="button"
        className="w-full text-[13px] text-zinc-600 underline-offset-2 hover:underline"
        disabled={busy}
        onClick={() => {
          setStep("phone");
          setChallengeId(null);
          setCode("");
          setError(null);
        }}
      >
        Изменить номер
      </button>
      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
