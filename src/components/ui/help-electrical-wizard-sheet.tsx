"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Sparkles,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
import { ApplianceBrandAvatar } from "@/components/ui/appliance-brand-avatar";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import {
  buildHelpElectricalAiPrompt,
  buildHelpElectricalContext,
  getApplianceProblems,
  PANEL_ELECTRICAL_PROBLEMS,
  panelHasHelpAppliances,
  type HelpCategory,
  type HelpElectricalContext,
  type HelpLocation,
  type HelpProblemOption,
} from "@/lib/help-electrical-flow";
import { applianceDisplayKindLabel } from "@/lib/home-appliances";
import { formatRub, MASTER_HOME_VISIT_PRICE_RUB } from "@/lib/lead-services";
import { hapticNotification } from "@/lib/haptics";
import { getTelegramUserName } from "@/lib/telegram-user";
import {
  formatPhoneDigits,
  getUserProfile,
  persistUserProfile,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";
import type { HomeAppliance, PanelObject } from "@/types";

type WizardStep =
  | "location"
  | "category"
  | "appliance"
  | "problem"
  | "other"
  | "ai"
  | "master_confirm";

function panelHelpAddress(panel: PanelObject): string {
  return (
    panel.houseSnapshot?.address?.trim() ||
    panel.address?.trim() ||
    "Адрес не указан"
  );
}

function stepTitle(step: WizardStep): string {
  switch (step) {
    case "location":
      return "Где нужна помощь?";
    case "category":
      return "С чем помочь?";
    case "appliance":
      return "Какая техника?";
    case "problem":
      return "Что случилось?";
    case "other":
      return "Опишите проблему";
    case "ai":
      return "Рекомендации";
    case "master_confirm":
      return "Вызов мастера";
  }
}

function DividedOptionList({
  options,
  onPick,
}: {
  options: Array<{ id: string; label: string; hint?: string }>;
  onPick: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPick(option.id)}
          className={cn(
            "w-full px-4 py-3.5 text-left transition-colors hover:bg-zinc-50",
            index > 0 && "border-t border-black/[0.06]",
          )}
        >
          <p className="ty-body text-zinc-900">{option.label}</p>
          {option.hint ? (
            <p className="mt-0.5 truncate ty-note text-zinc-500">{option.hint}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function CategoryChoiceCards({
  applianceCount,
  onPick,
}: {
  applianceCount: number;
  onPick: (category: HelpCategory) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onPick("electrical")}
        className="flex flex-col items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 text-center transition-colors hover:bg-zinc-50"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-700">
          <Zap className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="ty-label font-medium text-zinc-900">Помощь по электрике</p>
          <p className="mt-1 ty-meta text-zinc-500">Свет, розетки, автоматы</p>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onPick("appliance_repair")}
        className="flex flex-col items-center gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 text-center transition-colors hover:bg-zinc-50"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-700">
          <Wrench className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="ty-label font-medium text-zinc-900">Ремонт техники</p>
          <p className="mt-1 ty-meta text-zinc-500">
            {applianceCount > 0
              ? `${applianceCount} в карточке щитка`
              : "Бытовая техника"}
          </p>
        </div>
      </button>
    </div>
  );
}

function WizardApplianceList({
  appliances,
  onPick,
}: {
  appliances: HomeAppliance[];
  onPick: (applianceId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
      {appliances.map((appliance, index) => {
        const kindLabel = applianceDisplayKindLabel(appliance);
        const brand = appliance.brand?.trim();
        const model = appliance.model?.trim();

        return (
          <button
            key={appliance.id}
            type="button"
            onClick={() => onPick(appliance.id)}
            className={cn(
              "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50",
              index > 0 && "border-t border-black/[0.06]",
            )}
          >
            <ApplianceBrandAvatar
              kind={appliance.kind}
              brandLogoUrl={appliance.brandLogoUrl}
              brand={brand}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate ty-label">
                <span className="font-medium text-zinc-500">{kindLabel}</span>
                {brand ? <> {brand}</> : null}
              </span>
              {model ? (
                <span className="block truncate ty-meta">{model}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AiAnswerStep({
  context,
  onBack,
  onCallMaster,
  onConsultationReady,
}: {
  context: HelpElectricalContext;
  onBack: () => void;
  onCallMaster: () => void;
  onConsultationReady: (
    context: HelpElectricalContext,
    aiReply: string,
  ) => void | Promise<string | void>;
}) {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const consultationSavedRef = useRef(false);
  const onConsultationReadyRef = useRef(onConsultationReady);
  onConsultationReadyRef.current = onConsultationReady;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!canUseServerAuth()) {
        setError("Войдите через Telegram, чтобы получить ответ ИИ");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/consult", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            message: buildHelpElectricalAiPrompt(context),
            history: [],
            city: context.panelCity,
          }),
        });
        const data = (await res.json()) as { error?: string; reply?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось получить ответ");
        }
        if (!cancelled) {
          setReply(data.reply?.trim() || "Не удалось сформировать ответ.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось получить ответ",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [context]);

  useEffect(() => {
    if (!reply || consultationSavedRef.current) return;
    consultationSavedRef.current = true;
    void onConsultationReadyRef.current(context, reply);
  }, [reply, context]);

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3">
        <p className="ty-note text-zinc-500">Ваш запрос</p>
        <p className="mt-1 ty-body text-zinc-900">
          {context.customProblem?.trim() || context.problemLabel}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-[18px] border border-black/8 bg-white px-4 py-4 ty-body text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ток Токич анализирует ситуацию…
        </div>
      ) : null}

      {error ? (
        <p className="rounded-[18px] bg-red-50 px-4 py-3 ty-note text-red-700">
          {error}
        </p>
      ) : null}

      {reply ? (
        <div className="rounded-[18px] border border-black/8 bg-white px-4 py-3">
          <div className="mb-2 flex items-center gap-2 ty-note text-zinc-500">
            <Sparkles className="h-4 w-4" />
            Ответ ИИ-помощника
          </div>
          <p className="whitespace-pre-wrap ty-body text-zinc-800">{reply}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full"
          onClick={onCallMaster}
          disabled={loading || !reply}
        >
          <GeminiSparkle className="h-5 w-5" />
          Вызвать мастера
        </Button>
        <Button className="w-full" variant="secondary" onClick={onBack}>
          Назад
        </Button>
      </div>
    </div>
  );
}

function MasterConfirmStep({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: (payload: { phone: string; name: string }) => void | Promise<void>;
}) {
  const [phoneDigits, setPhoneDigits] = useState(
    () => getUserProfile().phoneDigits?.replace(/\D/g, "").slice(0, 10) ?? "",
  );
  const [confirming, setConfirming] = useState(false);
  const phoneDisplay = useMemo(
    () => formatPhoneDigits(phoneDigits),
    [phoneDigits],
  );
  const phoneValid = phoneDigits.length === 10;

  const handleConfirm = async () => {
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
    <div className="space-y-4">
      <p className="ty-body text-zinc-700">
        Стоимость вызова —{" "}
        <span className="font-medium text-zinc-900">
          {formatRub(MASTER_HOME_VISIT_PRICE_RUB)}
        </span>
        . Оплату нужно будет выполнить только после успешного поиска мастера.
      </p>

      <div>
        <div className="mb-2 ty-subtitle text-zinc-600">Телефон для связи</div>
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
      </div>

      <p className="ty-heading text-zinc-900">Искать мастера?</p>
      <Button
        className="w-full"
        size="lg"
        disabled={!phoneValid || confirming}
        onClick={() => void handleConfirm()}
      >
        {confirming ? "Отправляем…" : "Подтвердить"}
      </Button>
      <Button className="w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </div>
  );
}

export function HelpElectricalWizardSheet({
  panels,
  open,
  onClose,
  onElsewhere,
  onConsultationReady,
  onConfirmMasterVisit,
}: {
  panels: PanelObject[];
  open: boolean;
  onClose: () => void;
  onElsewhere: () => void;
  onConsultationReady: (
    context: HelpElectricalContext,
    aiReply: string,
  ) => void | Promise<string | void>;
  onConfirmMasterVisit: (payload: {
    context: HelpElectricalContext;
    consultationRequestId: string | null;
    phone: string;
    name: string;
  }) => void | Promise<void>;
}) {
  const [step, setStep] = useState<WizardStep>("location");
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [location, setLocation] = useState<HelpLocation | null>(null);
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string | null>(
    null,
  );
  const [selectedProblem, setSelectedProblem] =
    useState<HelpProblemOption | null>(null);
  const [customProblem, setCustomProblem] = useState("");
  const [aiContext, setAiContext] = useState<HelpElectricalContext | null>(null);
  const [consultationRequestId, setConsultationRequestId] = useState<
    string | null
  >(null);
  const wasOpenRef = useRef(false);

  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.id === selectedPanelId) ?? null,
    [panels, selectedPanelId],
  );

  const appliances = selectedPanel?.appliances ?? [];
  const selectedAppliance = appliances.find(
    (item) => item.id === selectedApplianceId,
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (panels.length === 0) {
        onElsewhere();
        return;
      }
      setStep("location");
      setSelectedPanelId(null);
      setLocation(null);
      setCategory(null);
      setSelectedApplianceId(null);
      setSelectedProblem(null);
      setCustomProblem("");
      setAiContext(null);
      setConsultationRequestId(null);
    }
    wasOpenRef.current = open;
  }, [open, panels.length, onElsewhere]);

  const handleConsultationReady = useCallback(
    async (context: HelpElectricalContext, aiReply: string) => {
      const id = await onConsultationReady(context, aiReply);
      if (typeof id === "string") {
        setConsultationRequestId(id);
      }
    },
    [onConsultationReady],
  );

  const goToAi = (problem: HelpProblemOption, customText?: string) => {
    if (!selectedPanel || !location || !category) return;
    const context = buildHelpElectricalContext({
      panel: selectedPanel,
      location,
      category,
      appliance: selectedAppliance,
      problem,
      customProblem: customText,
    });
    setAiContext(context);
    setStep("ai");
  };

  const handleLocationPick = (value: string) => {
    if (value === "elsewhere") {
      onElsewhere();
      return;
    }
    const panel = panels.find((item) => item.id === value);
    if (!panel) return;
    setSelectedPanelId(panel.id);
    setLocation("at_panel");
    if (panelHasHelpAppliances(panel)) {
      setStep("category");
      return;
    }
    setCategory("electrical");
    setStep("problem");
  };

  const handleCategoryPick = (value: HelpCategory) => {
    setCategory(value);
    if (value === "appliance_repair") {
      setStep("appliance");
      return;
    }
    setStep("problem");
  };

  const handleProblemPick = (problemId: string) => {
    const problems =
      category === "appliance_repair" && selectedAppliance
        ? getApplianceProblems(selectedAppliance.kind)
        : PANEL_ELECTRICAL_PROBLEMS;
    const problem = problems.find((item) => item.id === problemId);
    if (!problem) return;
    setSelectedProblem(problem);
    if (problem.id === "other") {
      setStep("other");
      return;
    }
    goToAi(problem);
  };

  const handleBack = () => {
    switch (step) {
      case "location":
        onClose();
        break;
      case "category":
        setStep("location");
        break;
      case "appliance":
        setStep("category");
        break;
      case "problem":
        if (category === "appliance_repair") {
          setStep("appliance");
        } else if (selectedPanel && panelHasHelpAppliances(selectedPanel)) {
          setStep("category");
        } else {
          setStep("location");
        }
        break;
      case "other":
        setStep("problem");
        break;
      case "ai":
        if (selectedProblem?.id === "other") {
          setStep("other");
        } else {
          setStep("problem");
        }
        setAiContext(null);
        break;
      case "master_confirm":
        setStep("ai");
        break;
    }
  };

  if (!open || panels.length === 0) return null;

  const locationOptions = [
    ...panels.map((panel) => {
      const address = panelHelpAddress(panel);
      return {
        id: panel.id,
        label: address,
        hint: panel.title !== address ? panel.title : undefined,
      };
    }),
    {
      id: "elsewhere",
      label: "Другой адрес",
      hint: "Укажем адрес на следующем шаге",
    },
  ];

  const problemOptions =
    category === "appliance_repair" && selectedAppliance
      ? getApplianceProblems(selectedAppliance.kind)
      : PANEL_ELECTRICAL_PROBLEMS;

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
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(event) => event.stopPropagation()}
          className="mx-auto max-h-[min(88vh,760px)] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              {step !== "location" ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
                  aria-label="Назад"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}
              <div className="min-w-0">
                <p className="mb-1 ty-note">Помочь с электрикой</p>
                <h2 className="ty-heading">{stepTitle(step)}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "location" ? (
            <DividedOptionList
              options={locationOptions}
              onPick={handleLocationPick}
            />
          ) : null}

          {step === "category" && selectedPanel ? (
            <CategoryChoiceCards
              applianceCount={selectedPanel.appliances?.length ?? 0}
              onPick={handleCategoryPick}
            />
          ) : null}

          {step === "appliance" ? (
            <WizardApplianceList
              appliances={appliances}
              onPick={(applianceId) => {
                setSelectedApplianceId(applianceId);
                setStep("problem");
              }}
            />
          ) : null}

          {step === "problem" ? (
            <DividedOptionList
              options={problemOptions.map((problem) => ({
                id: problem.id,
                label: problem.label,
              }))}
              onPick={handleProblemPick}
            />
          ) : null}

          {step === "other" ? (
            <div className="space-y-4">
              <textarea
                value={customProblem}
                onChange={(event) => setCustomProblem(event.target.value)}
                rows={4}
                placeholder="Опишите, что произошло"
                className="w-full rounded-[18px] border border-black/8 bg-white px-4 py-3 ty-body outline-none focus:border-zinc-300"
              />
              <Button
                className="w-full"
                disabled={!customProblem.trim() || !selectedProblem}
                onClick={() => {
                  if (!selectedProblem) return;
                  goToAi(selectedProblem, customProblem.trim());
                }}
              >
                Получить ответ
              </Button>
            </div>
          ) : null}

          {step === "ai" && aiContext ? (
            <AiAnswerStep
              context={aiContext}
              onBack={handleBack}
              onCallMaster={() => setStep("master_confirm")}
              onConsultationReady={handleConsultationReady}
            />
          ) : null}

          {step === "master_confirm" && aiContext ? (
            <MasterConfirmStep
              onBack={handleBack}
              onConfirm={(payload) =>
                void onConfirmMasterVisit({
                  context: aiContext,
                  consultationRequestId,
                  ...payload,
                })
              }
            />
          ) : null}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
