"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  buildSafetyStageCardCopy,
  formatSafetyScoreAssessment,
  panelSafetyStagesDisclaimer,
  stageScoreBadge,
  type PanelSafetyStagesSnapshot,
  type SafetyStageId,
  type SafetyStageSnapshot,
} from "@/lib/panel-safety-stages";
import { cn } from "@/lib/utils";

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

        {stages.map((stage, index) => {
          if (index >= completedCount || !badge) return null;
          return (
            <div
              key={stage.id}
              className={cn(
                "absolute inset-y-0 left-0 rounded-full shadow-[2px_0_3px_0_rgba(0,0,0,0.1)]",
                badge.bg,
              )}
              style={{
                width: `${((index + 1) / stages.length) * 100}%`,
                zIndex: index + 1,
              }}
            />
          );
        })}

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
            style={{ width: `${(completedCount / stages.length) * 100}%` }}
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
}: {
  snapshot: PanelSafetyStagesSnapshot;
  onClose: () => void;
}) {
  const copy = buildSafetyStageCardCopy(snapshot);
  const activeStage =
    snapshot.stages.find((stage) => stage.id === snapshot.activeStageId) ??
    snapshot.stages[0];
  const displayScore = snapshot.headlineScore ?? activeStage?.score ?? null;

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

          {displayScore != null && activeStage ? (
            <div className="mb-4 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3">
              <p className="ty-heading text-zinc-900">
                Этап «{activeStage.title}»: {displayScore}%
              </p>
              <p className="mt-1 ty-note text-zinc-600">
                {formatSafetyScoreAssessment(displayScore)}
              </p>
            </div>
          ) : null}

          <p className="mb-3 ty-body text-zinc-700">{copy.summary}</p>

          <div className="mb-4 space-y-2 ty-note leading-relaxed text-zinc-500">
            {copy.details.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <p className="mb-5 ty-note text-zinc-400">
            {panelSafetyStagesDisclaimer}
          </p>

          <Button className="w-full" onClick={onClose}>
            Понятно
          </Button>
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
}: {
  open: boolean;
  snapshot: PanelSafetyStagesSnapshot | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && snapshot ? (
        <PanelSafetyBarSheet snapshot={snapshot} onClose={onClose} />
      ) : null}
    </AnimatePresence>
  );
}
