"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Wrench } from "lucide-react";
import {
  formatRub,
  getLeadServiceOptions,
  isMoscow,
  masterLabelingPriceRub,
  MODULE_LABELING_PRICE_RUB,
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
  const modules =
    typeof panelModules === "number" && panelModules > 0 ? panelModules : null;
  const vivid = Boolean(modules);

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
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-500">
        Город:{" "}
        <span className="font-medium text-zinc-800">{normalizedCity}</span>
      </p>

      {!moscow && (
        <div className="mb-5 rounded-[24px] bg-amber-50 p-4">
          <p className="text-[14px] leading-relaxed text-amber-950/85">
            В этом городе пока доступна онлайн-консультация. Выезд мастера для
            прозвонки и маркировки есть в Москве.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {options.map((option, i) => {
          const isOnline = option.id === "online_consultation";
          const isMaster = option.id === "master_labeling";
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
                  "overflow-hidden rounded-[28px] p-5 shadow-[0_12px_32px_rgba(17,17,19,0.08)]",
                  vivid &&
                    isOnline &&
                    "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white",
                  vivid &&
                    isMaster &&
                    "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white",
                  !vivid &&
                    isOnline &&
                    "border border-indigo-100 bg-indigo-50 text-indigo-950",
                  !vivid &&
                    isMaster &&
                    "border border-emerald-100 bg-emerald-50 text-emerald-950",
                  !isOnline &&
                    !isMaster &&
                    "border border-black/8 bg-white text-zinc-900",
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl",
                      vivid && (isOnline || isMaster)
                        ? "bg-white/20"
                        : isOnline
                          ? "bg-indigo-100 text-indigo-700"
                          : isMaster
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500",
                    )}
                  >
                    {isOnline ? (
                      <MessageCircle className="h-5 w-5" />
                    ) : isMaster ? (
                      <Wrench className="h-5 w-5" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-[13px] font-bold tabular-nums",
                      vivid && (isOnline || isMaster)
                        ? "bg-white/20"
                        : isOnline
                          ? "bg-white/80 text-indigo-800"
                          : isMaster
                            ? "bg-white/80 text-emerald-800"
                            : "bg-zinc-100 text-zinc-700",
                    )}
                  >
                    {option.priceLabel}
                  </div>
                </div>
                <div className="text-[20px] font-bold leading-snug tracking-tight">
                  {option.title}
                </div>
                <p
                  className={cn(
                    "mt-2 text-[14px] leading-relaxed",
                    vivid && (isOnline || isMaster)
                      ? "text-white/90"
                      : isOnline
                        ? "text-indigo-950/70"
                        : isMaster
                          ? "text-emerald-950/70"
                          : "text-zinc-500",
                  )}
                >
                  {option.description}
                </p>

                {isMaster && modules && (
                  <div
                    className={cn(
                      "mt-4 rounded-[20px] p-3",
                      vivid ? "bg-white/18" : "bg-white/80",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[13px] font-medium",
                        vivid ? "text-white/85" : "text-emerald-900/80",
                      )}
                    >
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
                    <p
                      className={cn(
                        "mt-1 text-[12px]",
                        vivid ? "text-white/75" : "text-emerald-900/60",
                      )}
                    >
                      Стоимость выезда считается по числу модулей в паспорте
                      щитка.
                    </p>
                  </div>
                )}

                {isOnline && (
                  <p
                    className={cn(
                      "mt-4 text-[12px] leading-relaxed",
                      vivid ? "text-white/80" : "text-indigo-950/60",
                    )}
                  >
                    Если нужно пересобрать щиток, сделать проект или выполнить
                    монтажные работы по электрике — сначала консультация. Эта
                    сумма будет вычтена из дальнейшей общей стоимости работ.
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
