"use client";

import { Lock } from "lucide-react";
import {
  stageScoreBadge,
  type PanelSafetyStagesSnapshot,
  type SafetyStageId,
  type SafetyStageSnapshot,
} from "@/lib/panel-safety-stages";
import { cn } from "@/lib/utils";

function StageScore({
  stage,
  compact,
}: {
  stage: SafetyStageSnapshot;
  compact?: boolean;
}) {
  const badge = stageScoreBadge(stage.score);
  if (stage.status === "locked") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-zinc-100 text-zinc-400",
          compact ? "h-6 min-w-[2rem] px-1.5 text-[11px]" : "h-7 min-w-[2.25rem] px-2 text-[12px]",
        )}
        aria-hidden
      >
        <Lock className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      </span>
    );
  }
  if (stage.score == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-zinc-100 font-semibold tabular-nums text-zinc-500",
          compact ? "h-6 min-w-[2rem] px-1.5 text-[11px]" : "h-7 min-w-[2.25rem] px-2 text-[12px]",
        )}
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold tabular-nums",
        badge.bg,
        badge.text,
        compact ? "h-6 min-w-[2.25rem] px-1.5 text-[11px]" : "h-7 min-w-[2.5rem] px-2 text-[12px]",
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
  variant?: "compact" | "panel";
  className?: string;
  onStageClick?: (stageId: SafetyStageId) => void;
}) {
  const { stages, activeStageId } = snapshot;

  if (variant === "compact") {
    return (
      <div className={cn("flex min-w-0 items-center gap-1", className)}>
        {stages.map((stage, index) => {
          const body = (
            <>
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                {stage.step}
              </span>
              <StageScore stage={stage} compact />
            </>
          );
          const isInteractive = Boolean(onStageClick);
          return (
            <div key={stage.id} className="flex min-w-0 flex-1 items-center gap-1">
              {isInteractive ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStageClick?.(stage.id);
                  }}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center rounded-[12px] px-1 py-0.5 transition-colors",
                    stage.id === activeStageId && "bg-zinc-100",
                  )}
                  aria-label={`${stage.title}: ${stage.score != null ? `${stage.score}%` : stage.status === "locked" ? "закрыт" : "не готов"}`}
                >
                  {body}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center px-1 py-0.5",
                    stage.id === activeStageId && "rounded-[12px] bg-zinc-100",
                  )}
                >
                  {body}
                </div>
              )}
              {index < stages.length - 1 ? (
                <StageConnector active={stage.status === "done"} />
              ) : null}
            </div>
          );
        })}
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
