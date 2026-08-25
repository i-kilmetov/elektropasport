"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home, MessageCircle, Wrench } from "lucide-react";
import {
  brandChoiceClasses,
  LEAD_SERVICE_VARIANTS,
} from "@/lib/brand-choice-card";
import {
  formatRub,
  getLeadServiceOptions,
  masterLabelingPriceRub,
  MODULE_LABELING_PRICE_RUB,
  normalizeCityName,
  type LeadServiceType,
} from "@/lib/lead-services";
import { cn } from "@/lib/utils";

const SERVICE_ICONS: Record<
  LeadServiceType,
  typeof MessageCircle | typeof Home | typeof Wrench
> = {
  online_consultation: MessageCircle,
  master_home_visit: Home,
  master_labeling: Wrench,
  other: Wrench,
};

export function LeadServiceScreen({
  city,
  panelModules,
  isFirstOrder = false,
  onBack,
  onSelect,
}: {
  city: string;
  panelModules?: number | null;
  isFirstOrder?: boolean;
  onBack: () => void;
  onSelect: (serviceType: LeadServiceType) => void;
}) {
  const normalizedCity = normalizeCityName(city);
  const options = getLeadServiceOptions({
    city: normalizedCity,
    panelModules,
    isFirstOrder,
  });
  const modules =
    typeof panelModules === "number" && panelModules > 0 ? panelModules : null;

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
        Как вам помочь?
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-500">
        Город:{" "}
        <span className="font-medium text-zinc-800">{normalizedCity}</span>
      </p>

      <div className="flex flex-col gap-4">
        {options.map((option, i) => {
          const variant =
            LEAD_SERVICE_VARIANTS[option.id] ?? ("white" as const);
          const style = brandChoiceClasses[variant];
          const Icon = SERVICE_ICONS[option.id];
          const isLabeling = option.id === "master_labeling";

          return (
            <motion.button
              key={option.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(option.id)}
              className="text-left"
            >
              <div
                className={cn(
                  "overflow-hidden rounded-[28px] border p-5 shadow-[0_12px_32px_rgba(17,17,19,0.06)]",
                  style.card,
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl",
                      style.icon,
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-bold tabular-nums",
                      style.price,
                    )}
                  >
                    {option.struckPriceLabel && (
                      <span className="font-semibold text-current/45 line-through">
                        {option.struckPriceLabel}
                      </span>
                    )}
                    <span>{option.priceLabel}</span>
                  </div>
                </div>
                <div className="text-[20px] font-bold leading-snug tracking-tight">
                  {option.title}
                </div>
                <p className={cn("mt-2 text-[14px] leading-relaxed", style.body)}>
                  {option.description}
                </p>

                {isLabeling && modules && (
                  <div className={cn("mt-4 rounded-[20px] p-3", style.inset)}>
                    <p className="text-[13px] font-medium opacity-80">
                      В вашем щитке {modules}{" "}
                      {modules % 10 === 1 && modules % 100 !== 11
                        ? "модуль"
                        : modules % 10 >= 2 &&
                            modules % 10 <= 4 &&
                            (modules % 100 < 12 || modules % 100 > 14)
                          ? "модуля"
                          : "модулей"}
                    </p>
                    <p className="mt-1 text-[15px] font-semibold">
                      {modules} × {formatRub(MODULE_LABELING_PRICE_RUB)} ={" "}
                      {formatRub(masterLabelingPriceRub(modules))}
                    </p>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
