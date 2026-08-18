"use client";

import { Flame, MonitorSmartphone, UserRound } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  SAFETY_AXIS_META,
  safetyIndicatorColor,
  safetyTextColor,
  type SafetyAxes,
  type SafetyAxisId,
} from "@/lib/safety-score";
import { cn } from "@/lib/utils";

const AXIS_ICON: Record<SafetyAxisId, typeof UserRound> = {
  person: UserRound,
  fire: Flame,
  equipment: MonitorSmartphone,
};

const AXIS_ICON_COLOR: Record<SafetyAxisId, string> = {
  person: "text-sky-500",
  fire: "text-orange-500",
  equipment: "text-violet-500",
};

export function SafetyAxisMeters({
  axes,
  compact = false,
}: {
  axes: SafetyAxes;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-2.5", compact && "space-y-2")}>
      {SAFETY_AXIS_META.map((axis) => {
        const value = axes[axis.id];
        const Icon = AXIS_ICON[axis.id];
        return (
          <div key={axis.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    AXIS_ICON_COLOR[axis.id],
                  )}
                />
                <span
                  className={cn(
                    "font-semibold text-zinc-800",
                    compact ? "text-[12px]" : "text-[13px]",
                  )}
                >
                  {axis.title}
                </span>
                {!compact && (
                  <span className="truncate text-[11px] text-zinc-400">
                    {axis.hint}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "tabular-nums font-semibold",
                  compact ? "text-[12px]" : "text-[13px]",
                  safetyTextColor(value),
                )}
              >
                {value}%
              </span>
            </div>
            <Progress
              value={value}
              className={compact ? "h-1" : "h-1.5"}
              indicatorClassName={safetyIndicatorColor(value)}
            />
          </div>
        );
      })}
    </div>
  );
}
