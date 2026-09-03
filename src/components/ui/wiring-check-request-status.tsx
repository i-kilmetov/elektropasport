"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  installStatusLabels,
  installStatusProgress,
  installStatusSteps,
  installStatusTone,
  type InstallRequest,
} from "@/types";
import { cn } from "@/lib/utils";

export function WiringCheckRequestStatus({
  request,
  onOpenRequest,
}: {
  request: InstallRequest;
  onOpenRequest?: () => void;
}) {
  const closed = request.status === "cancelled" || request.status === "deleted";
  const tone = installStatusTone(request.status);
  const activeIndex =
    request.status === "new"
      ? 0
      : request.status === "payment"
        ? 1
        : request.status === "in_progress"
          ? 2
          : request.status === "done"
            ? 3
            : -1;

  return (
    <div className="mb-5 space-y-3 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="ty-label text-zinc-500">Заявка на проверку</p>
        <span className={cn("rounded-full px-2.5 py-1 ty-label", tone.badge)}>
          {installStatusLabels[request.status]}
        </span>
      </div>
      <Progress
        value={installStatusProgress(request.status)}
        className={cn(closed && "opacity-40")}
        indicatorClassName={tone.bar}
      />
      <div className="grid grid-cols-4 gap-1">
        {installStatusSteps.map((step, index) => {
          const reached = !closed && index <= activeIndex;
          const current = !closed && index === activeIndex;
          return (
            <div key={step.id} className="text-center">
              <div
                className={cn(
                  "mx-auto mb-1 h-2 w-2 rounded-full",
                  reached ? tone.dot : "bg-zinc-200",
                  current && `ring-2 ${tone.ring} ring-offset-1 ring-offset-zinc-50`,
                )}
              />
              <div
                className={cn(
                  "text-[9px] leading-tight",
                  current ? "font-medium text-zinc-900" : "text-zinc-500",
                )}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      {onOpenRequest ? (
        <Button className="w-full" variant="secondary" onClick={onOpenRequest}>
          Открыть заявку
        </Button>
      ) : null}
    </div>
  );
}
