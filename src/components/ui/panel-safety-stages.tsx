"use client";

import { Lock } from "lucide-react";
import {
  stageScoreBadge,
  type PanelSafetyStagesSnapshot,
  type SafetyStageId,
  type SafetyStageSnapshot,
} from "@/lib/panel-safety-stages";
import { cn } from "@/lib/utils";

function safetyBarFill(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-lime-500";
  if (score >= 50) return "bg-amber-400";
  if (score >= 35) return "bg-orange-500";
  return "bg-rose-500";
}

function SafetyStageBar({
  snapshot,
  className,
}: {
  snapshot: PanelSafetyStagesSnapshot;
  className?: string;
}) {
  const { stages, headlineScore } = snapshot;
  const completedCount = stages.filter((stage) => stage.score != null).length;
  const fillClass =
    headlineScore != null ? safetyBarFill(headlineScore) : null;

  return (
    <div
      className={cn(
        "relative h-9 w-full overflow-hidden rounded-full bg-zinc-200",
        className,
      )}
      role="img"
      aria-label={
        headlineScore != null
          ? `Безопасность щитка: ${headlineScore}%, этап ${completedCount} из 3`
          : "Безопасность щитка: оценка ещё не определена"
      }
    >
      {stages.map((stage, index) => {
        const isCompleted = index < completedCount;
        return (
          <div
            key={stage.id}
            className="absolute inset-y-0"
            style={{
              left: `${(index / stages.length) * 100}%`,
              width: `${100 / stages.length}%`,
              zIndex: index + 1,
            }}
          >
            <div
              className={cn(
                "absolute inset-0",
                isCompleted && fillClass ? fillClass : "bg-zinc-200",
              )}
            />
            {!isCompleted ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
              </div>
            ) : null}
          </div>
        );
      })}

      {headlineScore != null && completedCount > 0 ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center px-3.5"
          style={{ width: `${(completedCount / stages.length) * 100}%` }}
        >
          <span className="text-[13px] font-semibold tabular-nums text-white drop-shadow-sm">
            {headlineScore}%
          </span>
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
  variant?: "bar" | "compact" | "panel";
  className?: string;
  onStageClick?: (stageId: SafetyStageId) => void;
}) {
  const { stages, activeStageId } = snapshot;

  if (variant === "bar" || variant === "compact") {
    return <SafetyStageBar snapshot={snapshot} className={className} />;
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
