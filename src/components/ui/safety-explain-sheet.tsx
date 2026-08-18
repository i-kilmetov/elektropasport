"use client";

import { motion } from "framer-motion";
import { Check, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { Progress } from "@/components/ui/progress";
import {
  safetyIndicatorColor,
  safetyLabel,
  safetyScoreDisclaimer,
  safetyTextColor,
  type SafetyAdviceItem,
} from "@/lib/safety-score";
import { cn } from "@/lib/utils";

export function SafetyExplainSheet({
  score,
  advice,
  onClose,
  onEditParams,
  onCallMaster,
}: {
  score: number | null;
  advice: SafetyAdviceItem[];
  onClose: () => void;
  onEditParams?: () => void;
  onCallMaster?: () => void;
}) {
  const improve = advice.filter((item) => item.kind === "improve");
  const good = advice.filter((item) => item.kind === "good");
  const scoreKnown = typeof score === "number";

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
                Уровень безопасности
              </div>
              {scoreKnown ? (
                <div className="flex items-end gap-2">
                  <span
                    className={cn(
                      "text-[32px] font-bold tabular-nums leading-none",
                      safetyTextColor(score),
                    )}
                  >
                    {score}%
                  </span>
                  <span className="mb-0.5 text-[14px] text-zinc-500">
                    {safetyLabel(score)}
                  </span>
                </div>
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

          {scoreKnown && (
            <Progress
              value={score}
              className="mb-4 h-1.5"
              indicatorClassName={safetyIndicatorColor(score)}
            />
          )}

          <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
            {safetyScoreDisclaimer}
          </p>
          <p className="mb-5 text-[13px] leading-relaxed text-zinc-600">
            Оценка растёт, если в щитке есть вводной автомат, защита от утечки
            (УЗО или дифавтомат), реле напряжения, УЗИП, отдельные автоматы на
            линии, заземление, согласованный номинал ввода и нагрузки линий
            соответствуют автоматам. Расключение внутри щитка сервис не проверяет.
          </p>

          {improve.length > 0 && (
            <div className="mb-5">
              <h4 className="mb-2 text-[14px] font-semibold text-zinc-900">
                Что поднять оценку в этом щитке
              </h4>
              <ul className="space-y-2.5">
                {improve.map((item, index) => (
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
                ))}
              </ul>
            </div>
          )}

          {good.length > 0 && (
            <div className="mb-5">
              <h4 className="mb-2 text-[14px] font-semibold text-zinc-900">
                Что уже хорошо
              </h4>
              <ul className="space-y-2">
                {good.map((item) => (
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
                ))}
              </ul>
            </div>
          )}

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
            {onCallMaster && improve.length > 0 && (
              <Button
                className="w-full"
                variant={scoreKnown ? "default" : "secondary"}
                onClick={onCallMaster}
              >
                🦸 Вызвать мастера
              </Button>
            )}
            <Button
              className="w-full"
              variant="secondary"
              onClick={onClose}
            >
              Понятно
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
