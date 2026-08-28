"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import {
  GeminiSparkIcon,
  LiveSearchLamp,
} from "@/components/lead/service-live-icons";
import { FakeSbpPayScreen } from "@/components/pay/fake-sbp-pay";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  brandChoiceClasses,
  LEAD_SERVICE_VARIANTS,
} from "@/lib/brand-choice-card";
import {
  getLeadServiceOptions,
  normalizeCityName,
  type LeadServiceOption,
  type LeadServiceType,
} from "@/lib/lead-services";
import { cn } from "@/lib/utils";

export function LeadServiceScreen({
  city,
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
  const [hasMaster, setHasMaster] = useState<boolean | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [payOption, setPayOption] = useState<LeadServiceOption | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHasMaster(null);
    void fetch(
      `/api/masters/coverage?city=${encodeURIComponent(normalizedCity)}`,
    )
      .then(async (res) => {
        if (!res.ok) return { hasMaster: false };
        return (await res.json()) as { hasMaster?: boolean };
      })
      .then((data) => {
        if (!cancelled) setHasMaster(Boolean(data.hasMaster));
      })
      .catch(() => {
        if (!cancelled) setHasMaster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedCity]);

  const paidOptions =
    hasMaster == null
      ? []
      : getLeadServiceOptions({ hasConnectedMaster: hasMaster });

  if (paying && payOption && payOption.priceRub != null) {
    return (
      <motion.section
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
      >
        <FakeSbpPayScreen
          heading="Оплата услуги"
          serviceTitle={payOption.title}
          amountRub={payOption.priceRub}
          note="Оплата по СБП или QR. После подтверждения оставим контакты для связи."
          successText="Оплата получена. Дальше — контакты, чтобы мы могли связаться."
          successAction="Оставить контакты"
          onBack={() => setPaying(false)}
          onPaid={() => onSelect(payOption.id)}
        />
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
        <h1 className="ty-title">Услуга</h1>
      </header>

      <h2 className="mb-2 ty-display text-zinc-900">
        Как вам помочь?
      </h2>
      <p className="mb-5 ty-body">
        Город:{" "}
        <span className="font-medium text-zinc-800">{normalizedCity}</span>
      </p>

      <div className="flex flex-col gap-4">
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setAiOpen(true)}
          className="text-left"
        >
          <div
            className={cn(
              "overflow-hidden rounded-[28px] border p-5 shadow-[0_12px_32px_rgba(17,17,19,0.06)]",
              brandChoiceClasses.white.card,
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-50">
                <GeminiSparkIcon className="h-7 w-7" />
              </div>
            </div>
            <div className="ty-title">
              ИИ-консультация
            </div>
            <p className="mt-2 ty-body">
              Разберём щиток с искусственным интеллектом: быстро, без очереди к
              человеку.
            </p>
          </div>
        </motion.button>

        {hasMaster == null ? (
          <div className="rounded-[28px] border border-black/8 bg-white p-5 ty-body">
            Смотрим, кто из мастеров на связи в городе…
          </div>
        ) : (
          paidOptions.map((option, i) => {
            const variant =
              LEAD_SERVICE_VARIANTS[option.id] ?? ("white" as const);
            const style = brandChoiceClasses[variant];
            const isVisit = option.id === "master_home_visit";

            return (
              <motion.button
                key={option.id}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (i + 1) }}
                onClick={() => setPayOption(option)}
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
                        isVisit ? "bg-zinc-900" : style.icon,
                      )}
                    >
                      {isVisit ? (
                        <LiveSearchLamp className="h-11 w-11" />
                      ) : (
                        <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-bold tabular-nums",
                        style.price,
                      )}
                    >
                      <span>{option.priceLabel}</span>
                    </div>
                  </div>
                  <div className="ty-title">
                    {option.title}
                  </div>
                  <p className={cn("mt-2 ty-body", style.body)}>
                    {option.description}
                  </p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {aiOpen ? (
          <BottomSheet onClose={() => setAiOpen(false)}>
            <h2 className="ty-title">
              Консультант появится в ближайшее время
            </h2>
            <p className="mt-2 ty-body">
              ИИ-консультация ещё настраивается. Пока можно вызвать мастера или
              взять онлайн-консультацию — в зависимости от города.
            </p>
            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={() => setAiOpen(false)}
            >
              Понятно
            </Button>
          </BottomSheet>
        ) : null}
        {payOption && !paying ? (
          <BottomSheet onClose={() => setPayOption(null)}>
            <h2 className="ty-title">
              Подтверждение
            </h2>
            <p className="mt-2 ty-body">
              {payOption.title}
              {payOption.priceRub != null
                ? ` — ${payOption.priceLabel}`
                : ""}
              . {payOption.description}
            </p>
            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={() => setPaying(true)}
            >
              Оплатить
            </Button>
            <button
              type="button"
              onClick={() => setPayOption(null)}
              className="mt-3 w-full py-2 text-center ty-subtitle"
            >
              Не сейчас
            </button>
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function BottomSheet({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-[var(--bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 lg:max-w-md lg:rounded-[28px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 lg:hidden" />
          {children}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
