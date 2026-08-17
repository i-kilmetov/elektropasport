"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getLeadServiceOptions,
  isMoscow,
  normalizeCityName,
  type LeadServiceType,
} from "@/lib/lead-services";
import { cn } from "@/lib/utils";

export function LeadServiceScreen({
  city,
  panelModules,
  onBack,
  onSelect,
}: {
  city: string;
  panelModules?: number | null;
  onBack: () => void;
  onSelect: (serviceType: LeadServiceType) => void;
}) {
  const normalizedCity = normalizeCityName(city);
  const moscow = isMoscow(normalizedCity);
  const options = getLeadServiceOptions({
    city: normalizedCity,
    panelModules,
  });

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
        <h1 className="text-[20px] font-semibold text-zinc-900">Услуга</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        Что вам нужно?
      </h2>
      <p className="mb-4 text-[15px] leading-relaxed text-zinc-500">
        Город: <span className="font-medium text-zinc-800">{normalizedCity}</span>
      </p>

      {!moscow && (
        <div className="mb-5 flex gap-3 rounded-[20px] border border-amber-200/80 bg-amber-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-[14px] leading-relaxed text-amber-950/85">
            В этом городе работает только{" "}
            <span className="font-semibold">онлайн-консультация</span>. Выезд
            мастера для прозвонки и маркировки доступен в Москве.
          </p>
        </div>
      )}

      {moscow && panelModules && panelModules > 0 && (
        <div className="mb-5 rounded-[20px] border border-sky-200/80 bg-sky-50 p-4">
          <p className="text-[14px] leading-relaxed text-sky-950/85">
            По вашему щитку в паспорте —{" "}
            <span className="font-semibold">{panelModules} мод.</span>. Для
            выезда мастера посчитаем стоимость маркировки автоматически.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {options.map((option, i) => (
          <motion.button
            key={option.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            onClick={() => onSelect(option.id)}
            className="text-left"
          >
            <GlassCard className="flex items-start gap-3 p-4 transition-colors hover:bg-zinc-50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-[16px] font-semibold text-zinc-900">
                    {option.title}
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-[14px] font-semibold tabular-nums",
                      option.priceRub != null
                        ? "text-zinc-900"
                        : "text-zinc-500",
                    )}
                  >
                    {option.priceLabel}
                  </div>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                  {option.description}
                </p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-400" />
            </GlassCard>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
