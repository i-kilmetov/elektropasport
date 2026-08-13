"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Clock3, Phone } from "lucide-react";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import { Button } from "@/components/ui/button";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  saveUserProfile,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

type Step = "contact" | "done";

export function LeadContactScreen({
  onBack,
  onFinish,
  onGoHome,
  variant = "install",
}: {
  onBack: () => void;
  onFinish: (payload: {
    contactMethod: "phone" | "telegram";
    phone: string;
    name: string;
  }) => void | Promise<void>;
  onGoHome: () => void;
  variant?: "install" | "master";
}) {
  const [step, setStep] = useState<Step>("contact");
  const [digits, setDigits] = useState(
    () => getUserProfile().phoneDigits?.replace(/\D/g, "").slice(0, 10) ?? "",
  );
  const [preferTelegram, setPreferTelegram] = useState(false);
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const phoneDisplay = useMemo(() => formatPhoneDigits(digits), [digits]);
  const phoneValid = digits.length === 10;
  const canSubmit = phoneValid && consent && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    const name = getTelegramUserName();
    setDisplayName(name);
    setSubmitting(true);
    try {
      await onFinish({
        contactMethod:
          variant === "install" && preferTelegram ? "telegram" : "phone",
        phone: `+7${digits}`,
        name,
      });
      saveUserProfile({ phoneDigits: digits });
      hapticNotification("success");
    } finally {
      setSubmitting(false);
      setStep("done");
    }
  };

  if (step === "done") {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex min-h-dvh flex-col items-center justify-center px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-center"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-[24px] font-bold text-zinc-900">
          {variant === "master" ? "Заявка отправлена" : "Заявка принята"}
        </h1>
        <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-zinc-500">
          {variant === "master" ? (
            <>
              Спасибо{displayName ? `, ${displayName}` : ""}! Мы получили вашу
              заявку и свяжемся для обсуждения сотрудничества.
            </>
          ) : preferTelegram ? (
            <>
              Спасибо{displayName ? `, ${displayName}` : ""}! Напишем вам в
              Telegram, если сообщения от всех открыты. Если закрыты — мастер
              позвонит на указанный номер.
            </>
          ) : (
            <>
              Спасибо{displayName ? `, ${displayName}` : ""}! Мастер свяжется с
              вами по телефону в ближайшее время.
            </>
          )}
        </p>
        <Button className="w-full max-w-sm" onClick={onGoHome}>
          На главную
        </Button>
      </motion.section>
    );
  }

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
        <h1 className="text-[20px] font-semibold text-zinc-900">
          {variant === "master" ? "Контакты для связи" : "Связь с мастером"}
        </h1>
      </header>

      <div className="mb-5 rounded-[20px] border border-sky-400/20 bg-sky-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-sky-700">
          <Clock3 className="h-4 w-4 shrink-0" />
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Как мы свяжемся
          </h2>
        </div>
        <p className="text-[14px] leading-relaxed text-sky-900/75">
          {variant === "master"
            ? "Оставьте номер телефона — менеджер сервиса позвонит в течение рабочего дня, обычно в течение нескольких часов."
            : "Оставьте номер телефона — свяжемся в течение рабочего дня, обычно в течение нескольких часов, чтобы уточнить детали и подобрать мастера."}
        </p>
      </div>

      <div className="mb-3 text-[14px] font-medium text-zinc-600">Телефон</div>
      <div className="mb-3 flex items-center gap-2">
        <label className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-[20px] border border-black/8 bg-zinc-50 px-4 focus-within:border-[var(--accent)]/50">
          <Phone className="h-4 w-4 shrink-0 text-zinc-500" />
          <span className="text-[16px] font-medium text-zinc-700">+7</span>
          <input
            inputMode="numeric"
            value={phoneDisplay}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 10);
              setDigits(next);
              if (next.length !== 10) setPreferTelegram(false);
            }}
            placeholder="999 000-00-00"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </label>
        {variant === "install" && (
          <button
            type="button"
            disabled={!phoneValid}
            aria-pressed={preferTelegram}
            aria-label={
              preferTelegram
                ? "Не писать в Telegram"
                : "Связаться сообщением в Telegram"
            }
            onClick={() => {
              if (!phoneValid) return;
              setPreferTelegram((on) => !on);
              hapticImpact("light");
            }}
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] transition-colors",
              !phoneValid
                ? "bg-zinc-100 text-zinc-300"
                : preferTelegram
                  ? "bg-[#2AABEE] text-white"
                  : "bg-zinc-200 text-zinc-400",
            )}
          >
            <TelegramAppIcon className="h-7 w-7" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {variant === "install" && preferTelegram && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-3 overflow-hidden text-[13px] leading-relaxed text-zinc-500"
          >
            Напишем в Telegram, если у вас открыт доступ к сообщениям от всех.
            Если доступ закрыт — побеспокоим звонком.
          </motion.p>
        )}
      </AnimatePresence>

      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-[18px] border border-black/8 bg-zinc-50 p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-black/20 accent-[var(--accent)]"
        />
        <span className="text-[13px] leading-relaxed text-zinc-600">
          Я согласен(а) на обработку персональных данных (номер телефона) для
          связи по заявке.
        </span>
      </label>

      <div className="mt-auto">
        <Button
          className="w-full"
          size="lg"
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          Отправить заявку
        </Button>
      </div>
    </motion.section>
  );
}
