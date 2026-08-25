"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home, MessageCircle, Wrench } from "lucide-react";
import {
  formatRub,
  getLeadServiceOptions,
  masterLabelingPriceRub,
  MODULE_LABELING_PRICE_RUB,
  normalizeCityName,
  type LeadServiceType,
} from "@/lib/lead-services";
import { cn } from "@/lib/utils";

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
          const isOnline = option.id === "online_consultation";
          const isHomeVisit = option.id === "master_home_visit";
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
                  isOnline && "border-indigo-100 bg-indigo-50 text-indigo-950",
                  isHomeVisit &&
                    "border-emerald-100 bg-emerald-50 text-emerald-950",
                  isLabeling && "border-teal-100 bg-teal-50 text-teal-950",
                  !isOnline &&
                    !isHomeVisit &&
                    !isLabeling &&
                    "border-black/8 bg-white text-zinc-900",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl",
                      isOnline && "bg-indigo-100 text-indigo-700",
                      isHomeVisit && "bg-emerald-100 text-emerald-700",
                      isLabeling && "bg-teal-100 text-teal-700",
                    )}
                  >
                    {isOnline ? (
                      <MessageCircle className="h-5 w-5" />
                    ) : isHomeVisit ? (
                      <Home className="h-5 w-5" />
                    ) : (
                      <Wrench className="h-5 w-5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-bold tabular-nums",
                      isOnline && "bg-white/80 text-indigo-800",
                      isHomeVisit && "bg-white/80 text-emerald-800",
                      isLabeling && "bg-white/80 text-teal-800",
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
                <p
                  className={cn(
                    "mt-2 text-[14px] leading-relaxed",
                    isOnline && "text-indigo-950/70",
                    isHomeVisit && "text-emerald-950/70",
                    isLabeling && "text-teal-950/70",
                  )}
                >
                  {option.description}
                </p>

                {isLabeling && modules && (
                  <div className="mt-4 rounded-[20px] bg-white/80 p-3">
                    <p className="text-[13px] font-medium text-teal-900/80">
                      В вашем щитке {modules}{" "}
                      {modules % 10 === 1 && modules % 100 !== 11
                        ? "модуль"
                        : modules % 10 >= 2 &&
                            modules % 10 <= 4 &&
                            (modules % 100 < 12 || modules % 100 > 14)
                          ? "модуля"
                          : "модулей"}
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-teal-950">
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
