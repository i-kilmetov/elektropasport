"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";

export function SafetyParamsSheet({
  initialPhases,
  initialPowerKw,
  onCancel,
  onConfirm,
}: {
  initialPhases?: "1" | "3";
  initialPowerKw?: string;
  onCancel: () => void;
  onConfirm: (payload: { phases: "1" | "3"; powerKw: string }) => void;
}) {
  const [phases, setPhases] = useState<"1" | "3" | null>(
    initialPhases ?? null,
  );
  const [powerKw, setPowerKw] = useState(initialPowerKw ?? "");
  const [powerError, setPowerError] = useState<string | null>(null);

  const canSave =
    phases !== null && powerKw.trim().length > 0 && !powerError;

  const onPowerChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d.,]/g, "");
    setPowerKw(cleaned);
    if (!cleaned.trim()) {
      setPowerError(null);
      return;
    }
    const num = Number(cleaned.replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      setPowerError("Укажите мощность больше 0");
      return;
    }
    if (num > 50) {
      setPowerError(
        "Для квартиры или частного дома такая мощность маловероятна. Проверьте значение.",
      );
      return;
    }
    setPowerError(null);
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
        >
          <h3 className="mb-1 text-[20px] font-semibold text-zinc-900">
            Параметры сети
          </h3>
          <p className="mb-5 text-[14px] leading-relaxed text-zinc-500">
            Укажите, сколько фаз заходит в дом или квартиру и какая выделенная
            мощность. По ним и составу приборов оценим уровень безопасности.
          </p>

          <div className="mb-4">
            <div className="mb-2 text-[13px] font-medium text-zinc-600">
              Количество фаз
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "1" as const, label: "1 фаза" },
                  { id: "3" as const, label: "3 фазы" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPhases(option.id)}
                  className={cn(
                    "rounded-[16px] border px-3 py-3 text-[15px] font-semibold transition-colors",
                    phases === option.id
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-black/8 bg-zinc-50 text-zinc-800 hover:bg-zinc-100",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="mb-2 block text-[13px] font-medium text-zinc-600">
            Выделенная мощность, кВт
          </label>
          <input
            inputMode="decimal"
            value={powerKw}
            onChange={(e) => onPowerChange(e.target.value)}
            placeholder="Например, 7.5"
            className="mb-2 h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[var(--accent)]/50"
          />
          {powerError ? (
            <p className="mb-4 text-[12px] leading-relaxed text-rose-600">
              {powerError}
            </p>
          ) : (
            <p className="mb-4 text-[12px] leading-relaxed text-zinc-400">
              Обычно указано в договоре с энергосбытом или на вводном автомате.
            </p>
          )}

          <div className="flex gap-3">
            <Button className="flex-1" variant="secondary" onClick={onCancel}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              disabled={!canSave}
              onClick={() => {
                if (!phases || !canSave) return;
                onConfirm({ phases, powerKw: powerKw.trim() });
              }}
            >
              Оценить
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
