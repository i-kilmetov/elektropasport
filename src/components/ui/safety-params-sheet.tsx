"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Gauge, Zap } from "lucide-react";
import {
  GroundSymbol,
  SupplyCableIcon,
} from "@/components/icons/supply-cable";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { HintInfoButton } from "@/components/ui/spec-info-button";
import { recommendCopperCrossSectionMm2 } from "@/lib/supply-cable-size";
import { cn } from "@/lib/utils";

export const groundPresenceHint =
  "Посмотрите на вводной кабель в щитке. Жёлто-зелёная жила — это земля (PE): она садится на шину PE или на металлический корпус. Ноль — синий и идёт на шину N, его нельзя считать землёй. Если во вводе только фаза (коричневый, чёрный или серый) и синий ноль — заземления нет.";

export function SafetyParamsSheet({
  initialPhases,
  initialPowerKw,
  initialHasGround,
  onCancel,
  onConfirm,
}: {
  initialPhases?: "1" | "3";
  initialPowerKw?: string;
  initialHasGround?: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    phases: "1" | "3";
    powerKw: string;
    hasGround: boolean;
  }) => void;
}) {
  const [hasGround, setHasGround] = useState<boolean | null>(
    typeof initialHasGround === "boolean" ? initialHasGround : null,
  );
  const [phases, setPhases] = useState<"1" | "3" | null>(
    initialPhases ?? null,
  );
  const [powerKw, setPowerKw] = useState(initialPowerKw ?? "");
  const [powerError, setPowerError] = useState<string | null>(null);
  const [groundHintOpen, setGroundHintOpen] = useState(false);

  const showPhases = hasGround !== null;
  const showPower = showPhases && phases !== null;

  const powerNum = Number(powerKw.replace(",", "."));
  const cableAdvice = useMemo(() => {
    if (!phases || !Number.isFinite(powerNum) || powerNum <= 0 || powerError) {
      return null;
    }
    return recommendCopperCrossSectionMm2(powerNum, phases);
  }, [phases, powerNum, powerError]);

  const coreScale = cableAdvice
    ? Math.min(1.5, 0.85 + cableAdvice.mm2 / 20)
    : 1;

  const canSave =
    phases !== null &&
    hasGround !== null &&
    powerKw.trim().length > 0 &&
    !powerError;

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
          className="max-h-[min(92dvh,640px)] w-full overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
        >
          <h3 className="mb-1 text-[20px] font-semibold text-zinc-900">
            Параметры сети
          </h3>
          <p className="mb-5 text-[14px] leading-relaxed text-zinc-500">
            Ответьте по шагам — внизу соберём схему вводного кабеля.
          </p>

          {/* 1. Grounding */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <GroundSymbol className="h-5 w-5 text-emerald-700" />
              <span className="text-[13px] font-medium text-zinc-700">
                Есть заземление?
              </span>
              <HintInfoButton
                label="Как определить, есть ли земля"
                open={groundHintOpen}
                onToggle={() => setGroundHintOpen((v) => !v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: true, label: "Есть" },
                  { id: false, label: "Нет" },
                ] as const
              ).map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  onClick={() => {
                    setHasGround(option.id);
                    if (phases === null && option.id === false) {
                      // keep phases untouched
                    }
                  }}
                  className={cn(
                    "rounded-[16px] border px-3 py-3 text-[15px] font-semibold transition-colors",
                    hasGround === option.id
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-black/8 bg-zinc-50 text-zinc-800 hover:bg-zinc-100",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {groundHintOpen && (
              <p className="mt-2.5 text-[12px] leading-relaxed text-zinc-500">
                {groundPresenceHint}
              </p>
            )}
          </div>

          {/* 2. Phases — after ground */}
          {showPhases && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-700" />
                <span className="text-[13px] font-medium text-zinc-700">
                  Сколько фаз?
                </span>
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
            </motion.div>
          )}

          {/* 3. Power — after phases */}
          {showPower && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Gauge className="h-5 w-5 text-sky-700" />
                <span className="text-[13px] font-medium text-zinc-700">
                  Выделенная мощность, кВт
                </span>
              </div>
              <input
                inputMode="decimal"
                value={powerKw}
                onChange={(e) => onPowerChange(e.target.value)}
                placeholder="Например, 7.5"
                className="mb-2 h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
              />
              {powerError ? (
                <p className="text-[12px] leading-relaxed text-rose-600">
                  {powerError}
                </p>
              ) : (
                <p className="text-[12px] leading-relaxed text-zinc-400">
                  Обычно в договоре с энергосбытом или на вводном автомате.
                </p>
              )}
              {cableAdvice && (
                <div className="mt-3 rounded-[16px] border border-emerald-500/20 bg-emerald-50 px-3.5 py-3">
                  <p className="text-[13px] font-semibold text-emerald-950">
                    Медный кабель от {cableAdvice.mm2} мм²
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-emerald-900/80">
                    {cableAdvice.note} Это ориентир для ввода; точное сечение
                    зависит от длины линии и условий прокладки.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Live cable preview */}
          {(hasGround === true || phases !== null) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-4"
            >
              <p className="mb-3 text-center text-[12px] font-medium text-zinc-500">
                Вводной кабель
              </p>
              <div className="flex justify-center">
                <SupplyCableIcon
                  phases={phases}
                  hasGround={hasGround}
                  coreScale={coreScale}
                  className="scale-125"
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                {hasGround === true && <span>PE — жёлто-зелёный</span>}
                {phases === "1" && (
                  <>
                    <span>L — коричневый</span>
                    <span>N — синий</span>
                  </>
                )}
                {phases === "3" && (
                  <>
                    <span>L1–L3 — фазы</span>
                    <span>N — синий</span>
                  </>
                )}
              </div>
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button className="flex-1" variant="secondary" onClick={onCancel}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              disabled={!canSave}
              onClick={() => {
                if (!phases || hasGround === null || !canSave) return;
                onConfirm({
                  phases,
                  powerKw: powerKw.trim(),
                  hasGround,
                });
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
