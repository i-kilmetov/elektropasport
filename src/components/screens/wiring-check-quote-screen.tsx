"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticNotification } from "@/lib/haptics";
import {
  formatRub,
  WIRING_CHECK_MIN_PRICE_RUB,
  WIRING_CHECK_PRICE_PER_MODULE_RUB,
  wiringCheckVisitPriceRub,
} from "@/lib/lead-services";
import { wiringCheckMasterExplanation } from "@/lib/panel-safety-stages";
import { getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  persistUserProfile,
} from "@/lib/user-profile";

export function WiringCheckQuoteScreen({
  moduleCount,
  address,
  onBack,
  onConfirm,
}: {
  moduleCount: number;
  address?: string | null;
  onBack: () => void;
  onConfirm: (payload: {
    phone: string;
    name: string;
  }) => void | Promise<void>;
}) {
  const modules = Math.max(0, moduleCount);
  const lineTotal = modules * WIRING_CHECK_PRICE_PER_MODULE_RUB;
  const total = wiringCheckVisitPriceRub(modules);
  const minApplied = total > lineTotal || modules === 0;

  const [phoneDigits, setPhoneDigits] = useState(
    () => getUserProfile().phoneDigits?.replace(/\D/g, "").slice(0, 10) ?? "",
  );
  const [confirming, setConfirming] = useState(false);
  const phoneDisplay = useMemo(
    () => formatPhoneDigits(phoneDigits),
    [phoneDigits],
  );
  const phoneValid = phoneDigits.length === 10;

  const handleContinue = async () => {
    if (!phoneValid || confirming) return;
    setConfirming(true);
    try {
      await persistUserProfile({
        ...getUserProfile(),
        phoneDigits,
      });
      hapticNotification("success");
      await onConfirm({
        phone: `+7${phoneDigits}`,
        name: getTelegramUserName(),
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-zinc-700"
          aria-label="Назад"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <h1 className="ty-title truncate">Стоимость выезда</h1>
          <p className="ty-note">Проверка расключения щитка</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <GlassCard className="p-4">
          <p className="ty-body text-zinc-700">{wiringCheckMasterExplanation}</p>
        </GlassCard>

        {address ? (
          <GlassCard className="p-4">
            <p className="ty-meta text-zinc-500">Адрес выезда</p>
            <p className="mt-1 ty-heading text-zinc-900">{address}</p>
          </GlassCard>
        ) : null}

        <GlassCard className="space-y-3 p-4">
          <p className="ty-heading text-zinc-900">Расчёт</p>
          <div className="flex items-center justify-between gap-3 ty-body text-zinc-700">
            <span>
              {modules > 0
                ? `${modules} ${modules === 1 ? "модуль" : modules < 5 ? "модуля" : "модулей"} × ${formatRub(WIRING_CHECK_PRICE_PER_MODULE_RUB)}`
                : `За модуль — ${formatRub(WIRING_CHECK_PRICE_PER_MODULE_RUB)}`}
            </span>
            <span className="tabular-nums">{formatRub(lineTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 ty-note text-zinc-500">
            <span>Минимум за выезд</span>
            <span className="tabular-nums">
              {formatRub(WIRING_CHECK_MIN_PRICE_RUB)}
            </span>
          </div>
          {minApplied ? (
            <p className="ty-meta text-zinc-500">
              Применяется минимальная стоимость выезда.
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
            <span className="ty-heading text-zinc-900">Итого</span>
            <span className="ty-title tabular-nums text-zinc-900">
              {formatRub(total)}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <p className="mb-2 ty-heading text-zinc-900">Телефон для связи</p>
          <label className="flex h-14 items-center gap-2 rounded-[20px] border border-black/8 bg-zinc-50 px-4 focus-within:border-zinc-300">
            <Phone className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="ty-subtitle text-zinc-700">+7</span>
            <input
              inputMode="numeric"
              value={phoneDisplay}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhoneDigits(next);
              }}
              placeholder="999 000-00-00"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
          <p className="mt-2 ty-meta text-zinc-500">
            После подтверждения сразу начнём поиск мастера
          </p>
        </GlassCard>
      </div>

      <div className="mt-4 shrink-0 space-y-2">
        <Button
          className="w-full"
          size="lg"
          disabled={!phoneValid || confirming}
          onClick={() => void handleContinue()}
        >
          {confirming ? "Отправляем…" : "Продолжить"}
        </Button>
        <Button className="w-full" variant="secondary" onClick={onBack}>
          Назад к адресу
        </Button>
      </div>
    </motion.section>
  );
}
