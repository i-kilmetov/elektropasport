"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Check,
  Clock3,
  Home,
  Phone,
} from "lucide-react";
import { RequestTicket } from "@/components/icons/request-ticket";
import { TelegramAppIcon } from "@/components/icons/telegram-app-icon";
import type {
  DwellingType,
  PhaseCount,
} from "@/components/screens/electrical-details-screen";
import { Button } from "@/components/ui/button";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { allocateRequestPublicCode } from "@/lib/user-data";
import type { RequestTypeCode } from "@/lib/request-codes";
import {
  buildLeadServiceSetupTitle,
  formatRub,
  getLeadServiceLabel,
  payableAmountRub,
  type LeadServiceType,
} from "@/lib/lead-services";
import {
  clearPendingInstallLead,
  writePendingInstallLead,
  type PendingInstallLead,
} from "@/lib/pending-lead";
import { getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  persistUserProfile,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

type Step = "contact" | "done";

export type LeadFinishPayload = {
  id?: string;
  contactMethod: "phone" | "telegram";
  phone: string;
  name: string;
  city?: string;
  serviceType?: LeadServiceType;
  estimatedPriceRub?: number | null;
  panelModules?: number;
  dwelling?: DwellingType;
  phases?: PhaseCount;
  powerKw?: string;
  setupTitle?: string;
  exactAddress?: string;
  publicCode?: string;
  paymentStatus?: "pending" | "confirmed";
  paidAmountRub?: number;
  tbankPaymentId?: string;
  panelId?: string;
};

function resolveEstimatedPriceRub(
  serviceType?: LeadServiceType,
  panelModules?: number,
  isFirstOrder?: boolean,
): number | null | undefined {
  return (
    payableAmountRub({ serviceType, panelModules, isFirstOrder }) ?? undefined
  );
}

export function LeadContactScreen({
  onBack,
  onFinish,
  onGoHome,
  variant = "install",
  setupTitle,
  city,
  exactAddress,
  serviceType,
  panelModules,
  isFirstOrder = false,
  typeCode = "U",
  panelId,
}: {
  onBack: () => void;
  onFinish: (payload: LeadFinishPayload) => void | Promise<void>;
  onGoHome: () => void;
  variant?: "install" | "master";
  setupTitle?: string;
  city?: string;
  exactAddress?: string;
  serviceType?: LeadServiceType;
  panelModules?: number;
  isFirstOrder?: boolean;
  typeCode?: RequestTypeCode;
  panelId?: string;
}) {
  const [step, setStep] = useState<Step>("contact");
  const [digits, setDigits] = useState(
    () => getUserProfile().phoneDigits?.replace(/\D/g, "").slice(0, 10) ?? "",
  );
  const [preferTelegram, setPreferTelegram] = useState(false);
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [dwelling, setDwelling] = useState<DwellingType | null>(null);
  const [phases, setPhases] = useState<PhaseCount | null>(null);
  const [powerKw, setPowerKw] = useState("");

  const pendingRef = useRef<PendingInstallLead | null>(null);
  const flushedRef = useRef(false);

  const phoneDisplay = useMemo(() => formatPhoneDigits(digits), [digits]);
  const phoneValid = digits.length === 10;
  const canSubmit = phoneValid && consent && !submitting;

  const estimatedPriceRub = resolveEstimatedPriceRub(
    serviceType,
    panelModules,
    isFirstOrder,
  );

  const resolvedSetupTitle = useMemo(() => {
    if (setupTitle) return setupTitle;
    if (!serviceType) return undefined;
    return buildLeadServiceSetupTitle({
      serviceType,
      panelModules,
      estimatedPriceRub,
    });
  }, [setupTitle, serviceType, panelModules, estimatedPriceRub]);

  const hasDetails = Boolean(dwelling || phases || powerKw.trim());

  const syncPending = (patch: Partial<PendingInstallLead>) => {
    const current = pendingRef.current;
    if (!current) return;
    const next = { ...current, ...patch };
    pendingRef.current = next;
    writePendingInstallLead(next);
  };

  const flushLead = () => {
    if (variant !== "install" || flushedRef.current) return;
    const draft = pendingRef.current;
    if (!draft) return;
    flushedRef.current = true;
    clearPendingInstallLead();
    void onFinish(draft);
  };

  const flushLeadRef = useRef(flushLead);
  flushLeadRef.current = flushLead;

  useEffect(() => {
    if (step !== "done" || variant !== "install") return;

    const onHide = () => {
      if (document.visibilityState === "hidden") flushLeadRef.current();
    };
    const onPageHide = () => flushLeadRef.current();

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [step, variant]);

  const submit = async () => {
    if (!canSubmit) return;
    const name = getTelegramUserName();
    setDisplayName(name);
    try {
      await persistUserProfile({
        ...getUserProfile(),
        phoneDigits: digits,
      });
    } catch (error) {
      console.error(error);
    }

    if (variant === "master") {
      hapticNotification("success");
      setSubmitting(true);
      try {
        await onFinish({
          contactMethod: "phone",
          phone: `+7${digits}`,
          name,
          city,
        });
      } finally {
        setSubmitting(false);
        setStep("done");
      }
      return;
    }

    setSubmitting(true);
    try {
      const code = await allocateRequestPublicCode(typeCode);
      const draft: PendingInstallLead = {
        id: `request-${Date.now()}`,
        contactMethod: preferTelegram ? "telegram" : "phone",
        phone: `+7${digits}`,
        name,
        city,
        exactAddress,
        serviceType,
        estimatedPriceRub,
        panelModules,
        setupTitle: resolvedSetupTitle,
        publicCode: code,
        paidAmountRub: estimatedPriceRub ?? undefined,
        panelId,
      };
      pendingRef.current = draft;
      writePendingInstallLead(draft);
      setPublicCode(code);
      flushedRef.current = true;
      clearPendingInstallLead();
      hapticNotification("success");
      await onFinish(draft);
    } finally {
      setSubmitting(false);
    }
  };

  const goHome = () => {
    flushLead();
    onGoHome();
  };

  if (step === "done") {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]"
      >
        <div className="mb-5 flex flex-col items-center text-center">
          {variant === "install" && publicCode ? (
            <div className="mb-4 w-full">
              <RequestTicket publicCode={publicCode} />
            </div>
          ) : (
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
          )}
          <h1 className="mb-2 text-[24px] font-bold text-zinc-900">
            {variant === "master" ? "Заявка отправлена" : "Заявка принята"}
          </h1>
          <p className="max-w-sm text-[15px] leading-relaxed text-zinc-500">
            {variant === "master"
              ? `Спасибо${displayName ? `, ${displayName}` : ""}! Мы получили вашу заявку и свяжемся для обсуждения сотрудничества.`
              : "Свяжемся с вами в ближайшее время."}
          </p>
        </div>

        {variant === "install" && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-zinc-900">
                Уточните детали
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                Эти данные помогут нам быстрее и точнее вам помочь. Можно не
                заполнять.
              </p>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-medium text-zinc-600">
                Объект
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDwelling("apartment");
                    syncPending({ dwelling: "apartment" });
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-[18px] border px-3 py-3 text-left transition-colors",
                    dwelling === "apartment"
                      ? "border-rose-200 bg-rose-50"
                      : "border-black/8 bg-zinc-50",
                  )}
                >
                  <Building2 className="h-4 w-4 text-rose-400" />
                  <span className="text-[14px] font-semibold text-zinc-900">
                    Квартира
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDwelling("house");
                    syncPending({ dwelling: "house" });
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-[18px] border px-3 py-3 text-left transition-colors",
                    dwelling === "house"
                      ? "border-rose-200 bg-rose-50"
                      : "border-black/8 bg-zinc-50",
                  )}
                >
                  <Home className="h-4 w-4 text-rose-400" />
                  <span className="text-[14px] font-semibold text-zinc-900">
                    Дом
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-medium text-zinc-600">
                Количество фаз
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["1", "1 фаза"],
                    ["3", "3 фазы"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPhases(value);
                      syncPending({ phases: value });
                    }}
                    className={cn(
                      "rounded-[18px] border px-3 py-3 text-[14px] font-semibold transition-colors",
                      phases === value
                        ? "border-rose-200 bg-rose-50 text-zinc-900"
                        : "border-black/8 bg-zinc-50 text-zinc-700",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[13px] font-medium text-zinc-600">
                Выделенная мощность, кВт
              </div>
              <input
                inputMode="decimal"
                value={powerKw}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.,]/g, "");
                  setPowerKw(next);
                  syncPending({
                    powerKw: next.trim().replace(",", ".") || undefined,
                  });
                }}
                placeholder="Например, 7"
                className="h-12 w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
              />
            </div>
          </div>
        )}

        <div className="mt-auto shrink-0 pt-2">
          <Button className="w-full" size="lg" onClick={goHome}>
            {hasDetails ? "Отправить" : "На главную"}
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">
          {variant === "master" ? "Контакты для связи" : "Связь с мастером"}
        </h1>
      </header>

      {variant === "install" && (city || serviceType) && (
        <div className="mb-5 rounded-[20px] border border-black/8 bg-zinc-50 p-4">
          {city && (
            <p className="text-[13px] text-zinc-500">
              Город:{" "}
              <span className="font-medium text-zinc-800">{city}</span>
            </p>
          )}
          {exactAddress && (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
              {exactAddress}
            </p>
          )}
          {serviceType && (
            <p className="mt-1 text-[15px] font-semibold text-zinc-900">
              {getLeadServiceLabel(serviceType)}
            </p>
          )}
          {estimatedPriceRub != null && (
            <p className="mt-1 text-[14px] font-medium tabular-nums text-zinc-700">
              {formatRub(estimatedPriceRub)}
            </p>
          )}
          {serviceType === "other" && (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Стоимость определим после разговора по телефону.
            </p>
          )}
        </div>
      )}

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
        <label className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-[20px] border border-black/8 bg-zinc-50 px-4 focus-within:border-zinc-300">
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
          className="mt-1 h-4 w-4 shrink-0 rounded border-black/20 accent-zinc-800"
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
