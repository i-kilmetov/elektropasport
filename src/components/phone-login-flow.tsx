"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { beginTelegramLogin } from "@/lib/pd-consent-client";
import {
  fetchBrowserLoginEnabled,
  startPhoneLogin,
  verifyPhoneLogin,
  completeBrowserLogin,
} from "@/lib/phone-auth-client";
import { cn } from "@/lib/utils";

const PHONE_PREFIX = "+7";
const CODE_LENGTH = 6;

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

function TelegramLoginLink({
  disabled,
  isSplash,
  onClick,
}: {
  disabled?: boolean;
  isSplash?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "mx-auto block w-full pt-1 text-[14px] underline disabled:opacity-50",
        isSplash ? "text-zinc-900/70" : "text-zinc-500",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      Войти через Telegram
    </button>
  );
}

function CodeUnderlineInput({
  value,
  disabled,
  isSplash,
  onChange,
  onComplete,
}: {
  value: string;
  disabled?: boolean;
  isSplash?: boolean;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="relative"
      onClick={() => {
        if (!disabled) inputRef.current?.focus();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        disabled={disabled}
        maxLength={CODE_LENGTH}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
          onChange(next);
          if (next.length === CODE_LENGTH) {
            onComplete(next);
          }
        }}
        className="absolute inset-0 cursor-text opacity-0"
        aria-label="Код подтверждения"
      />
      <div className="flex justify-center gap-3 sm:gap-4">
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const digit = value[index] ?? "";
          const active = index === value.length;
          return (
            <div
              key={index}
              className="flex w-9 flex-col items-center sm:w-10"
            >
              <span
                className={cn(
                  "flex h-9 items-end justify-center text-[28px] font-medium leading-none tabular-nums sm:h-10 sm:text-[32px]",
                  isSplash ? "text-zinc-900" : "text-zinc-900",
                  !digit && "text-transparent",
                )}
              >
                {digit || "0"}
              </span>
              <span
                className={cn(
                  "mt-1 h-[2px] w-full rounded-full transition-colors",
                  digit || active
                    ? isSplash
                      ? "bg-zinc-900"
                      : "bg-zinc-900"
                    : isSplash
                      ? "bg-zinc-900/25"
                      : "bg-zinc-300",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const verifyingRef = useRef(false);

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

  const handleVerify = async (value: string) => {
    if (
      !challengeId ||
      value.length !== CODE_LENGTH ||
      busy ||
      verifyingRef.current
    ) {
      return;
    }

    verifyingRef.current = true;
    setError(null);
    setBusy(true);
    try {
      const { token, user } = await verifyPhoneLogin({
        challengeId,
        code: value,
      });
      completeBrowserLogin(token, user, returnTo);
    } catch (err) {
      setCode("");
      setBusy(false);
      verifyingRef.current = false;
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
        <p className="text-center text-[13px] text-zinc-600">
          Вход по телефону временно недоступен
        </p>
        <TelegramLoginLink
          isSplash={isSplash}
          disabled={busy}
          onClick={handleTelegramLogin}
        />
        {error && (
          <p className="text-center text-[13px] text-red-600">{error}</p>
        )}
      </div>
    );
  }

  if (step === "phone") {
    return (
      <div className={cn("space-y-3", className)}>
        <div
          className={cn(
            "flex h-14 min-h-14 w-full items-center gap-3 rounded-full bg-white px-5",
            isSplash ? "text-zinc-900" : "border border-black/10 text-zinc-900",
          )}
        >
          <span className="shrink-0 text-[22px] leading-none" aria-hidden>
            🇷🇺
          </span>
          <input
            id="phone-login"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(formatRuPhone(event.target.value))}
            placeholder="+7 900 123-45-67"
            aria-label="Номер телефона"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
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
          {busy ? "Входим…" : "Войти"}
        </Button>
        <TelegramLoginLink
          isSplash={isSplash}
          disabled={busy}
          onClick={handleTelegramLogin}
        />
        {error && (
          <p className="text-center text-[13px] text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <CodeUnderlineInput
        value={code}
        disabled={busy}
        isSplash={isSplash}
        onChange={(next) => {
          setError(null);
          setCode(next);
        }}
        onComplete={(value) => void handleVerify(value)}
      />
      <button
        type="button"
        className={cn(
          "w-full text-[13px] underline-offset-2 hover:underline disabled:opacity-50",
          isSplash ? "text-zinc-900/70" : "text-zinc-600",
        )}
        disabled={busy}
        onClick={() => {
          setStep("phone");
          setChallengeId(null);
          setCode("");
          setError(null);
          verifyingRef.current = false;
        }}
      >
        Изменить номер
      </button>
      <TelegramLoginLink
        isSplash={isSplash}
        disabled={busy}
        onClick={handleTelegramLogin}
      />
      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
