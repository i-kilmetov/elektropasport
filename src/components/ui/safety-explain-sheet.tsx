"use client";

import { motion } from "framer-motion";
import { Check, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { SafetyAxisMeters } from "@/components/ui/safety-axis-meters";
import {
  SAFETY_AXIS_META,
  safetyScoreDisclaimer,
  type SafetyAdviceItem,
  type SafetyAxes,
  type SafetyAxisId,
} from "@/lib/safety-score";
import { cn } from "@/lib/utils";

export function SafetyExplainSheet({
  score,
  axes,
  advice,
  onClose,
  onEditParams,
  onCallMaster,
}: {
  score: number | null;
  axes?: SafetyAxes | null;
  advice: SafetyAdviceItem[];
  onClose: () => void;
  onEditParams?: () => void;
  onCallMaster?: () => void;
}) {
  const scoreKnown = typeof score === "number" && Boolean(axes);
  const generalImprove = advice.filter(
    (item) => item.kind === "improve" && item.axis === "general",
  );
  const improveCount = advice.filter((item) => item.kind === "improve").length;

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
              <div className="mb-1 flex items-center gap-1.5 text-[13px] text-zinc-500">
                <Shield className="h-3.5 w-3.5" />
                Безопасность щитка
              </div>
              {scoreKnown ? (
                <p className="text-[13px] text-zinc-500">
                  Средняя оценка {score}%
                </p>
              ) : (
                <h3 className="text-[20px] font-semibold text-zinc-900">
                  Пока не посчитан
                </h3>
              )}
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

          {scoreKnown && axes && (
            <div className="mb-4">
              <SafetyAxisMeters axes={axes} />
            </div>
          )}

          <p className="mb-5 text-[13px] leading-relaxed text-zinc-500">
            {safetyScoreDisclaimer}
          </p>

          {generalImprove.length > 0 && (
            <AdviceList
              title="Сначала заполните данные"
              items={generalImprove}
              kind="improve"
            />
          )}

          {SAFETY_AXIS_META.map((axis) => (
            <AxisAdvice
              key={axis.id}
              axisId={axis.id}
              title={axis.title}
              hint={axis.hint}
              advice={advice}
            />
          ))}

          <div className="flex flex-col gap-2">
            {onEditParams && (
              <Button
                className="w-full"
                variant={scoreKnown ? "secondary" : "default"}
                onClick={onEditParams}
              >
                Параметры сети
              </Button>
            )}
            {onCallMaster && improveCount > 0 && (
              <Button
                className="w-full"
                variant={scoreKnown ? "default" : "secondary"}
                onClick={onCallMaster}
              >
                🦸 Вызвать мастера
              </Button>
            )}
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
      <h4 className="mb-1 text-[14px] font-semibold text-zinc-900">{title}</h4>
      <p className="mb-2 text-[12px] text-zinc-500">Защита {hint}</p>
      {improve.length > 0 && (
        <AdviceList items={improve} kind="improve" />
      )}
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
      {title && (
        <h4 className="mb-2 text-[14px] font-semibold text-zinc-900">{title}</h4>
      )}
      <ul className="space-y-2">
        {items.map((item, index) =>
          kind === "improve" ? (
            <li
              key={item.id}
              className="rounded-[16px] border border-amber-200/70 bg-amber-50/70 px-3 py-3"
            >
              <div className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-[11px] font-semibold text-amber-900">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-snug text-zinc-900">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
                    {item.detail}
                  </p>
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
                <div className="text-[14px] font-semibold leading-snug text-zinc-900">
                  {item.title}
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">
                  {item.detail}
                </p>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
