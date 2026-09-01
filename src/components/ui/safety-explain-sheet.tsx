"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
import { Portal } from "@/components/ui/portal";
import { PanelSafetyStages } from "@/components/ui/panel-safety-stages";
import { SafetyAxisMeters } from "@/components/ui/safety-axis-meters";
import {
  areFirstTwoSafetyStagesDone,
  formatSafetyScoreAssessment,
  panelSafetyStagesDisclaimer,
  type PanelSafetyStagesSnapshot,
  type SafetyStageId,
} from "@/lib/panel-safety-stages";
import {
  SAFETY_AXIS_META,
  type SafetyAdviceItem,
  type SafetyAxisId,
} from "@/lib/safety-score";
import { cn } from "@/lib/utils";

export function SafetyExplainSheet({
  stages,
  advice,
  onClose,
  onEditParams,
  onCallMaster,
}: {
  stages: PanelSafetyStagesSnapshot;
  advice: SafetyAdviceItem[];
  onClose: () => void;
  onEditParams?: () => void;
  onCallMaster?: () => void;
}) {
  const [selectedStageId, setSelectedStageId] = useState<SafetyStageId>(
    stages.activeStageId,
  );
  const selectedStage =
    stages.stages.find((stage) => stage.id === selectedStageId) ??
    stages.stages[0];
  const improveCount = advice.filter((item) => item.kind === "improve").length;
  const generalImprove = advice.filter(
    (item) => item.kind === "improve" && item.axis === "general",
  );
  const stageAnalysis = selectedStage?.analysis;
  const bothStagesDone = areFirstTwoSafetyStagesDone(stages);
  const selectedScore = selectedStage?.score;

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-1.5 ty-note">
                <Shield className="h-3.5 w-3.5" />
                Безопасность щитка
              </div>
              <h3 className="ty-title">Три этапа оценки</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <PanelSafetyStages
            snapshot={stages}
            onStageClick={setSelectedStageId}
            className="mb-4"
          />

          <p className="mb-4 ty-note">{panelSafetyStagesDisclaimer}</p>

          {selectedScore != null ? (
            <div className="mb-4 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3">
              <p className="ty-heading text-zinc-900">
                Этап «{selectedStage.title}»: {selectedScore}%
              </p>
              <p className="mt-1 ty-note text-zinc-600">
                {formatSafetyScoreAssessment(selectedScore)}
              </p>
            </div>
          ) : null}

          {selectedScore != null && stageAnalysis?.axes ? (
            <div className="mb-4 rounded-[18px] border border-black/8 bg-zinc-50 p-3">
              <p className="mb-2 ty-label text-zinc-500">
                Детализация этапа «{selectedStage.title}»
              </p>
              <SafetyAxisMeters axes={stageAnalysis.axes} compact />
            </div>
          ) : null}

          {generalImprove.length > 0 && selectedStage?.id !== "professional" ? (
            <AdviceList
              title="Что сделать дальше"
              items={generalImprove}
              kind="improve"
            />
          ) : null}

          {selectedStage?.id !== "professional" && stageAnalysis
            ? SAFETY_AXIS_META.map((axis) => (
                <AxisAdvice
                  key={axis.id}
                  axisId={axis.id}
                  title={axis.title}
                  hint={axis.hint}
                  advice={stageAnalysis.advice}
                />
              ))
            : bothStagesDone &&
                selectedStage?.id === "professional" &&
                selectedStage.status !== "done" ? (
              <div className="mb-5 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3 ty-body text-zinc-600">
                Финальная оценка возможна после проверки расключения щитка и
                типа кабелей к нагрузкам: как соединены автоматы, УЗО и линии.
              </div>
            ) : null}

          <div className="flex flex-col gap-2">
            {onEditParams && selectedStage?.id === "scheme" ? (
              <Button className="w-full" variant="secondary" onClick={onEditParams}>
                Параметры сети
              </Button>
            ) : null}
            {onCallMaster &&
            bothStagesDone &&
            (selectedStage?.id === "professional" || improveCount > 0) ? (
              <Button className="w-full" onClick={onCallMaster}>
                <GeminiSparkle className="h-5 w-5" />
                {selectedStage?.id === "professional"
                  ? "Вызвать электрика"
                  : "Помочь с электрикой"}
              </Button>
            ) : null}
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Понятно
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}

function AxisAdvice({
  axisId,
  title,
  hint,
  advice,
}: {
  axisId: SafetyAxisId;
  title: string;
  hint: string;
  advice: SafetyAdviceItem[];
}) {
  const items = advice.filter((item) => item.axis === axisId);
  if (items.length === 0) return null;
  const improve = items.filter((item) => item.kind === "improve");
  const good = items.filter((item) => item.kind === "good");
  return (
    <div className="mb-5">
      <h4 className="mb-1 ty-heading">{title}</h4>
      <p className="mb-2 ty-note">Защита {hint}</p>
      {improve.length > 0 && <AdviceList items={improve} kind="improve" />}
      {good.length > 0 && (
        <AdviceList className="mt-2" items={good} kind="good" />
      )}
    </div>
  );
}

function AdviceList({
  title,
  items,
  kind,
  className,
}: {
  title?: string;
  items: SafetyAdviceItem[];
  kind: "good" | "improve";
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className, !title && "mb-0")}>
      {title ? <h4 className="mb-2 ty-heading">{title}</h4> : null}
      <ul className="space-y-2">
        {items.map((item, index) =>
          kind === "improve" ? (
            <li
              key={item.id}
              className="rounded-[16px] border border-amber-200/70 bg-amber-50/70 px-3 py-3"
            >
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/80 ty-badge text-amber-900">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="ty-heading leading-snug text-zinc-900">
                    {item.title}
                  </div>
                  <p className="mt-1 ty-note">{item.detail}</p>
                </div>
              </div>
            </li>
          ) : (
            <li
              key={item.id}
              className="flex gap-2.5 rounded-[16px] border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <div className="ty-heading leading-snug text-zinc-900">
                  {item.title}
                </div>
                <p className="mt-0.5 ty-note">{item.detail}</p>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
