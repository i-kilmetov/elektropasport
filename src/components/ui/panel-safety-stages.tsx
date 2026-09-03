"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  areFirstTwoSafetyStagesDone,
  buildSafetyBarSheetDetails,
  buildSafetyStageCardCopy,
  formatSafetyScoreAssessment,
  getLastCompletedSafetyStage,
  panelSafetyStagesDisclaimer,
  stageScoreBadge,
  wiringCheckMasterExplanation,
  type PanelSafetyStagesSnapshot,
  type SafetyStageId,
  type SafetyStageSnapshot,
} from "@/lib/panel-safety-stages";
import { cn } from "@/lib/utils";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
import { WiringCheckRequestStatus } from "@/components/ui/wiring-check-request-status";
import type { InstallRequest } from "@/types";

function SafetyStageBar({
  snapshot,
  className,
}: {
  snapshot: PanelSafetyStagesSnapshot;
  className?: string;
}) {
  const { stages, headlineScore } = snapshot;
  const completedCount = stages.filter((stage) => stage.score != null).length;
  const badge =
    headlineScore != null ? stageScoreBadge(headlineScore) : null;
  const fillWidth =
    completedCount > 0 ? `${(completedCount / stages.length) * 100}%` : "0%";

  return (
    <div
      className={cn("relative w-full", className)}
      role="img"
      aria-label={
        headlineScore != null
          ? `Безопасность щитка: ${headlineScore}%, этап ${completedCount} из 3`
          : "Безопасность щитка: оценка ещё не определена"
      }
    >
      <div className="relative h-5 w-full">
        <div className="absolute inset-0 rounded-full bg-zinc-100" />

        {completedCount > 0 && badge ? (
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              badge.bg,
            )}
            style={{ width: fillWidth }}
          />
        ) : null}

        {stages.map((stage, index) => {
          if (index < completedCount) return null;
          return (
            <div
              key={`lock-${stage.id}`}
              className="absolute inset-y-0 flex items-center justify-center"
              style={{
                left: `${(index / stages.length) * 100}%`,
                width: `${100 / stages.length}%`,
                zIndex: 10,
              }}
            >
              <Lock className="h-2.5 w-2.5 text-zinc-400" aria-hidden />
            </div>
          );
        })}

        {headlineScore != null && completedCount > 0 && badge ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center px-3"
            style={{ width: fillWidth }}
          >
            <span
              className={cn(
                "ty-badge font-semibold tabular-nums",
                badge.text,
              )}
            >
              {headlineScore}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PanelSafetyBarSheet({
  snapshot,
  onClose,
  onCallMaster,
  onHowWeCalculate,
  linkedWiringRequest,
  onOpenWiringRequest,
}: {
  snapshot: PanelSafetyStagesSnapshot;
  onClose: () => void;
  onCallMaster?: () => void;
  onHowWeCalculate?: () => void;
  linkedWiringRequest?: InstallRequest | null;
  onOpenWiringRequest?: () => void;
}) {
  const copy = buildSafetyStageCardCopy(snapshot);
  const completedStage = getLastCompletedSafetyStage(snapshot);
  const detailParagraphs = buildSafetyBarSheetDetails(snapshot);
  const bothStagesDone = areFirstTwoSafetyStagesDone(snapshot);
  const hasLinkedRequest = Boolean(linkedWiringRequest);

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="ty-title">Безопасность щитка</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <SafetyStageBar snapshot={snapshot} className="mb-4" />

          {completedStage?.score != null ? (
            <div className="mb-4 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3">
              <p className="ty-heading text-zinc-900">
                Этап «{completedStage.title}»: {completedStage.score}%
              </p>
              <p className="mt-1 ty-note text-zinc-600">
                {formatSafetyScoreAssessment(completedStage.score)}
              </p>
            </div>
          ) : (
            <p className="mb-4 ty-body text-zinc-700">{copy.summary}</p>
          )}

          <div className="mb-4 space-y-2 ty-note leading-relaxed text-zinc-500">
            {detailParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {hasLinkedRequest && linkedWiringRequest ? (
            <WiringCheckRequestStatus
              request={linkedWiringRequest}
              onOpenRequest={
                onOpenWiringRequest
                  ? () => {
                      onClose();
                      onOpenWiringRequest();
                    }
                  : undefined
              }
            />
          ) : bothStagesDone ? (
            <div className="mb-4 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3 ty-body text-zinc-600">
              {wiringCheckMasterExplanation}
            </div>
          ) : (
            <p className="mb-5 ty-note text-zinc-400">
              {panelSafetyStagesDisclaimer}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {bothStagesDone && onCallMaster && !hasLinkedRequest ? (
              <Button
                className="w-full"
                onClick={() => {
                  onClose();
                  onCallMaster();
                }}
              >
                <GeminiSparkle className="h-5 w-5" />
                Вызвать мастера
              </Button>
            ) : null}
            <Button
              className="w-full"
              variant={
                bothStagesDone && onCallMaster && !hasLinkedRequest
                  ? "secondary"
                  : undefined
              }
              onClick={onClose}
            >
              Понятно
            </Button>
            {onHowWeCalculate ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onHowWeCalculate();
                }}
                className="w-full py-2 text-center ty-label text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
              >
                Как мы считаем
              </button>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}

function PanelSafetyStageCardDetails({
  snapshot,
}: {
  snapshot: PanelSafetyStagesSnapshot;
}) {
  const [expanded, setExpanded] = useState(false);
  const copy = buildSafetyStageCardCopy(snapshot);

  return (
    <div className="mt-3 border-t border-black/[0.06] pt-3">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={expanded}
      >
        <p className="min-w-0 flex-1 ty-note leading-snug text-zinc-600">
          {copy.summary}
        </p>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="mt-2 space-y-2 ty-note leading-relaxed text-zinc-500">
          {copy.details.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageScore({
  stage,
}: {
  stage: SafetyStageSnapshot;
}) {
  const badge = stageScoreBadge(stage.score);
  if (stage.status === "locked") {
    return (
      <span
        className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full bg-zinc-100 px-2 text-[12px] text-zinc-400"
        aria-hidden
      >
        <Lock className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (stage.score == null) {
    return (
      <span className="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full bg-zinc-100 px-2 text-[12px] font-semibold tabular-nums text-zinc-500">
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full px-2 text-[12px] font-semibold tabular-nums",
        badge.bg,
        badge.text,
      )}
    >
      {stage.score}%
    </span>
  );
}

function StageTimelineRail({
  stage,
  isLast,
}: {
  stage: SafetyStageSnapshot;
  isLast: boolean;
}) {
  return (
    <div className="flex w-7 shrink-0 flex-col items-center self-stretch">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
          stage.status === "done"
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-400",
        )}
      >
        {stage.step}
      </div>
      {!isLast ? (
        <div
          className={cn(
            "my-1 w-0.5 flex-1 rounded-full",
            stage.status === "done" ? "bg-zinc-900/70" : "bg-zinc-200",
          )}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export function PanelSafetyStages({
  snapshot,
  variant = "panel",
  className,
  onStageClick,
}: {
  snapshot: PanelSafetyStagesSnapshot;
  variant?: "bar" | "compact" | "detailed" | "panel";
  className?: string;
  onStageClick?: (stageId: SafetyStageId) => void;
}) {
  const { stages, activeStageId } = snapshot;

  if (variant === "bar" || variant === "compact") {
    return <SafetyStageBar snapshot={snapshot} className={className} />;
  }

  if (variant === "detailed") {
    return (
      <div className={cn("min-w-0", className)}>
        <div className="mb-3 ty-note">Оценка безопасности щитка</div>
        <SafetyStageBar snapshot={snapshot} />
        <PanelSafetyStageCardDetails snapshot={snapshot} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {stages.map((stage, index) => {
        const interactive = Boolean(onStageClick);
        const isSelected = stage.id === activeStageId;
        const content = (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="ty-heading text-zinc-900">{stage.title}</span>
              </div>
              <p className="mt-0.5 ty-note">{stage.subtitle}</p>
              <p className="mt-1 ty-meta text-zinc-500">{stage.hint}</p>
            </div>
            <StageScore stage={stage} />
          </>
        );

        const cardClassName = cn(
          "flex flex-1 items-start gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-colors",
          isSelected
            ? "border-zinc-900/10 bg-zinc-50"
            : "border-black/8 bg-white",
          interactive && !isSelected && "hover:bg-zinc-50",
        );

        return (
          <div key={stage.id} className="flex gap-3">
            <StageTimelineRail
              stage={stage}
              isLast={index === stages.length - 1}
            />
            {interactive ? (
              <button
                type="button"
                onClick={() => onStageClick?.(stage.id)}
                className={cn(cardClassName, "mb-3 min-w-0")}
              >
                {content}
              </button>
            ) : (
              <div className={cn(cardClassName, "mb-3 min-w-0")}>{content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PanelSafetyBarSheetHost({
  open,
  snapshot,
  onClose,
  onCallMaster,
  onHowWeCalculate,
  linkedWiringRequest,
  onOpenWiringRequest,
}: {
  open: boolean;
  snapshot: PanelSafetyStagesSnapshot | null;
  onClose: () => void;
  onCallMaster?: () => void;
  onHowWeCalculate?: () => void;
  linkedWiringRequest?: InstallRequest | null;
  onOpenWiringRequest?: () => void;
}) {
  return (
    <AnimatePresence>
      {open && snapshot ? (
        <PanelSafetyBarSheet
          snapshot={snapshot}
          onClose={onClose}
          onCallMaster={onCallMaster}
          onHowWeCalculate={onHowWeCalculate}
          linkedWiringRequest={linkedWiringRequest}
          onOpenWiringRequest={onOpenWiringRequest}
        />
      ) : null}
    </AnimatePresence>
  );
}
