"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import {
  buildSafetyStageCardCopy,
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
      <div className="relative h-7 w-full rounded-full bg-zinc-100 shadow-inner shadow-black/[0.04]">
        {stages.map((stage, index) => {
          if (index < completedCount) return null;
          return (
            <div
              key={stage.id}
              className="absolute inset-y-0 flex items-center justify-center"
              style={{
                left: `${(index / stages.length) * 100}%`,
                width: `${100 / stages.length}%`,
              }}
            >
              <Lock className="h-3 w-3 text-zinc-400" aria-hidden />
            </div>
          );
        })}

        {completedCount > 0 && headlineScore != null && badge ? (
          <div
            className={cn(
              "absolute inset-y-0 left-0 z-10 flex items-center justify-center rounded-full px-3 ty-badge font-semibold tabular-nums shadow-sm",
              badge.bg,
              badge.text,
            )}
            style={{ width: `${(completedCount / stages.length) * 100}%` }}
          >
            {headlineScore}%
          </div>
        ) : null}
      </div>
    </div>
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
        <p className="mt-2 ty-note leading-relaxed text-zinc-500">{copy.details}</p>
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

function StageConnector({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "h-0.5 flex-1 rounded-full",
        active ? "bg-zinc-900/70" : "bg-zinc-200",
      )}
      aria-hidden
    />
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
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                stage.status === "done"
                  ? "bg-zinc-900 text-white"
                  : stage.id === activeStageId
                    ? "bg-zinc-200 text-zinc-900"
                    : "bg-zinc-100 text-zinc-400",
              )}
            >
              {stage.step}
            </div>
            {index < stages.length - 1 ? (
              <StageConnector active={stage.status === "done"} />
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {stages.map((stage) => {
          const interactive = Boolean(onStageClick);
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="ty-heading text-zinc-900">{stage.title}</span>
                  {stage.id === activeStageId && stage.status !== "done" ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Сейчас
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 ty-note">{stage.subtitle}</p>
                <p className="mt-1 ty-meta text-zinc-500">{stage.hint}</p>
              </div>
              <StageScore stage={stage} />
            </>
          );
          if (interactive) {
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageClick?.(stage.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-colors",
                  stage.id === activeStageId
                    ? "border-zinc-900/10 bg-zinc-50"
                    : "border-black/8 bg-white hover:bg-zinc-50",
                )}
              >
                {content}
              </button>
            );
          }
          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-start gap-3 rounded-[18px] border px-3.5 py-3",
                stage.id === activeStageId
                  ? "border-zinc-900/10 bg-zinc-50"
                  : "border-black/8 bg-white",
              )}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
