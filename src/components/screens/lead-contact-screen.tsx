"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

type Step = "contact" | "name" | "done";

function formatPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 8);
  const p4 = d.slice(8, 10);
  let out = "";
  if (p1) out += `(${p1}`;
  if (p1.length === 3) out += ") ";
  if (p2) out += p2;
  if (p2.length === 3) out += "-";
  if (p3) out += p3;
  if (p3.length === 2) out += "-";
  if (p4) out += p4;
  return out;
}

export function LeadContactScreen({
  city,
  onBack,
  onFinish,
}: {
  city: string;
  onBack: () => void;
  onFinish: (payload: {
    contactMethod: "phone" | "telegram";
    phone?: string;
    name: string;
  }) => void;
}) {
  const [step, setStep] = useState<Step>("contact");
  const [digits, setDigits] = useState("");
  const [useTelegram, setUseTelegram] = useState(false);
  const [name, setName] = useState("");

  const phoneDisplay = useMemo(() => formatPhoneDigits(digits), [digits]);
  const phoneValid = digits.length === 10;

  if (step === "done") {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex min-h-dvh flex-col items-center justify-center px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-center"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-[24px] font-bold text-white">Заявка принята</h1>
        <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-white/55">
          Спасибо{name ? `, ${name}` : ""}! Мастер из города{" "}
          <span className="font-semibold text-white">{city}</span> свяжется с
          вами в ближайшее время.
        </p>
        <Button
          className="w-full max-w-sm"
          onClick={() =>
            onFinish({
              contactMethod: useTelegram ? "telegram" : "phone",
              phone: useTelegram ? undefined : `+7${digits}`,
              name: name.trim(),
            })
          }
        >
          На главную
        </Button>
      </motion.section>
    );
  }

  if (step === "name") {
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
            onClick={() => setStep("contact")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[20px] font-semibold text-white">Как к вам обращаться?</h1>
        </header>

        <h2 className="mb-2 text-[26px] font-bold tracking-tight text-white">
          Введите имя
        </h2>
        <p className="mb-6 text-[15px] text-white/50">
          Чтобы мастер знал, как к вам обратиться.
        </p>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ваше имя"
          className="mb-4 h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.06] px-4 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50"
        />

        <div className="mt-auto">
          <Button
            className="w-full"
            size="lg"
            disabled={!name.trim()}
            onClick={() => setStep("done")}
          >
            Отправить заявку
          </Button>
        </div>
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Связь с мастером</h1>
      </header>

      <div className="mb-5 rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4">
        <h2 className="mb-1 text-[18px] font-semibold text-white">
          Отличные новости!
        </h2>
        <p className="text-[14px] leading-relaxed text-emerald-50/85">
          В городе <span className="font-semibold text-white">{city}</span> есть
          замечательные мастера-эксперты по установке электрощитков. Оставьте
          контакт — подберём специалиста.
        </p>
      </div>

      <div className="mb-3 text-[14px] font-medium text-white/70">Телефон</div>
      <label
        className={cn(
          "mb-4 flex h-14 items-center gap-2 rounded-[20px] border bg-white/[0.06] px-4",
          useTelegram
            ? "border-white/8 opacity-45"
            : "border-white/10 focus-within:border-[var(--accent)]/50",
        )}
      >
        <Phone className="h-4 w-4 shrink-0 text-white/40" />
        <span className="text-[16px] font-medium text-white/80">+7</span>
        <input
          inputMode="numeric"
          disabled={useTelegram}
          value={phoneDisplay}
          onChange={(e) => {
            const only = e.target.value.replace(/\D/g, "").slice(0, 10);
            setDigits(only);
            setUseTelegram(false);
          }}
          placeholder="(999) 000-00-00"
          className="h-full flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/30 disabled:cursor-not-allowed"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          setUseTelegram((v) => !v);
          if (!useTelegram) setDigits("");
        }}
        className={cn(
          "mb-3 flex w-full items-center gap-3 rounded-[20px] border px-4 py-4 text-left transition-colors",
          useTelegram
            ? "border-sky-400/40 bg-sky-500/15"
            : "border-white/10 bg-white/[0.04]",
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold text-white">
            Связаться со мной в Telegram
          </span>
          <span className="mt-0.5 block text-[12px] text-white/45">
            Удобно, раз вы уже в Mini App
          </span>
        </span>
        <span
          className={cn(
            "h-5 w-5 rounded-full border",
            useTelegram
              ? "border-sky-300 bg-sky-400"
              : "border-white/30 bg-transparent",
          )}
        />
      </button>

      {useTelegram && (
        <GlassCard className="mb-4 p-4 text-[13px] leading-relaxed text-white/55">
          Если в Telegram включён запрет на сообщения от неизвестных контактов,
          мастер может не дописать вам. Разрешите сообщения от всех или оставьте
          телефон.
        </GlassCard>
      )}

      <div className="mt-auto">
        <Button
          className="w-full"
          size="lg"
          disabled={!useTelegram && !phoneValid}
          onClick={() => setStep("name")}
        >
          Далее
        </Button>
      </div>
    </motion.section>
  );
}
