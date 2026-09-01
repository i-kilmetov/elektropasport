"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, X } from "lucide-react";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
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
import { equipmentLabelForAppliance } from "@/lib/appliance-line-sync";
import type { PanelObject } from "@/types";

type WizardStep =
  | "panel"
  | "location"
  | "category"
  | "appliance"
  | "problem"
  | "other"
  | "ai";

function stepTitle(step: WizardStep): string {
  switch (step) {
    case "panel":
      return "Какой щиток?";
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
  }
}

function OptionList({
  options,
  onPick,
}: {
  options: Array<{ id: string; label: string; hint?: string }>;
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPick(option.id)}
          className="w-full rounded-[18px] border border-black/8 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50"
        >
          <p className="ty-body text-zinc-900">{option.label}</p>
          {option.hint ? (
            <p className="mt-0.5 ty-note text-zinc-500">{option.hint}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function AiAnswerStep({
  context,
  onBack,
  onCallMaster,
}: {
  context: HelpElectricalContext;
  onBack: () => void;
  onCallMaster: (context: HelpElectricalContext) => void;
}) {
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          onClick={() => onCallMaster(context)}
          disabled={loading}
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

export function HelpElectricalWizardSheet({
  panels,
  open,
  onClose,
  onElsewhere,
  onCallMaster,
}: {
  panels: PanelObject[];
  open: boolean;
  onClose: () => void;
  onElsewhere: () => void;
  onCallMaster: (context: HelpElectricalContext) => void;
}) {
  const [step, setStep] = useState<WizardStep>(
    panels.length > 1 ? "panel" : "location",
  );
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(
    panels.length === 1 ? panels[0]?.id ?? null : null,
  );
  const [location, setLocation] = useState<HelpLocation | null>(null);
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string | null>(
    null,
  );
  const [selectedProblem, setSelectedProblem] =
    useState<HelpProblemOption | null>(null);
  const [customProblem, setCustomProblem] = useState("");
  const [aiContext, setAiContext] = useState<HelpElectricalContext | null>(null);

  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.id === selectedPanelId) ?? null,
    [panels, selectedPanelId],
  );

  const appliances = selectedPanel?.appliances ?? [];
  const selectedAppliance = appliances.find(
    (item) => item.id === selectedApplianceId,
  );

  useEffect(() => {
    if (!open) return;
    setStep(panels.length > 1 ? "panel" : "location");
    setSelectedPanelId(panels.length === 1 ? panels[0]?.id ?? null : null);
    setLocation(null);
    setCategory(null);
    setSelectedApplianceId(null);
    setSelectedProblem(null);
    setCustomProblem("");
    setAiContext(null);
  }, [open, panels]);

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
      case "panel":
        onClose();
        break;
      case "location":
        if (panels.length > 1) {
          setStep("panel");
        } else {
          onClose();
        }
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
        } else if (panelHasHelpAppliances(selectedPanel!)) {
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
    }
  };

  if (!open) return null;

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
              {step !== "panel" || panels.length > 1 ? (
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

          {step === "panel" ? (
            <OptionList
              options={panels.map((panel) => ({
                id: panel.id,
                label: panel.title,
                hint: panel.houseSnapshot?.address ?? panel.address,
              }))}
              onPick={(panelId) => {
                setSelectedPanelId(panelId);
                setStep("location");
              }}
            />
          ) : null}

          {step === "location" && selectedPanel ? (
            <OptionList
              options={[
                {
                  id: "at_panel",
                  label: "Там, где этот щиток",
                  hint:
                    selectedPanel.houseSnapshot?.address ??
                    selectedPanel.address ??
                    "Адрес из карточки щитка",
                },
                {
                  id: "elsewhere",
                  label: "В другом месте",
                  hint: "Укажем адрес на следующем шаге",
                },
              ]}
              onPick={(value) => {
                if (value === "elsewhere") {
                  onElsewhere();
                  return;
                }
                setLocation("at_panel");
                if (panelHasHelpAppliances(selectedPanel)) {
                  setStep("category");
                  return;
                }
                setCategory("electrical");
                setStep("problem");
              }}
            />
          ) : null}

          {step === "category" && selectedPanel ? (
            <OptionList
              options={[
                {
                  id: "electrical",
                  label: "Помощь по электрике",
                  hint: "Свет, розетки, автоматы, щиток",
                },
                {
                  id: "appliance_repair",
                  label: "Помощь с ремонтом техники",
                  hint: `${selectedPanel.appliances?.length ?? 0} поз. в карточке щитка`,
                },
              ]}
              onPick={(value) => {
                setCategory(value as HelpCategory);
                if (value === "appliance_repair") {
                  setStep("appliance");
                  return;
                }
                setStep("problem");
              }}
            />
          ) : null}

          {step === "appliance" ? (
            <OptionList
              options={appliances.map((appliance) => ({
                id: appliance.id,
                label: equipmentLabelForAppliance(appliance),
                hint: appliance.brand?.trim() || undefined,
              }))}
              onPick={(applianceId) => {
                setSelectedApplianceId(applianceId);
                setStep("problem");
              }}
            />
          ) : null}

          {step === "problem" ? (
            <OptionList
              options={
                category === "appliance_repair" && selectedAppliance
                  ? getApplianceProblems(selectedAppliance.kind)
                  : PANEL_ELECTRICAL_PROBLEMS
              }
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
              onCallMaster={onCallMaster}
            />
          ) : null}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
