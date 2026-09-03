"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  PanelXrayScan,
  useXrayReveal,
} from "@/components/ui/panel-xray-scan";
import { analysisSteps } from "@/lib/mock-data";
import { analyzePanel } from "@/lib/analyze-panel";
import {
  MAX_MODULES_PER_RAIL,
  panelHasRailOverflow,
} from "@/lib/panel-rails";
import { isDeviceDetailsConfident } from "@/lib/manufacturer-brands";
import type { AnalyzePanelResult, Device } from "@/types";

function deviceWord(count: number): string {
  if (count === 1) return "прибор";
  if (count < 5) return "прибора";
  return "приборов";
}

function isRailDeviceUncertain(device: Device): boolean {
  if (device.type === "pe_bus" || device.type === "n_bus") return false;
  return !isDeviceDetailsConfident(device);
}

export function AnalysisScreen({
  photoDataUrl,
  onDone,
  onRetryPhoto,
}: {
  photoDataUrl?: string | null;
  onDone: (result: AnalyzePanelResult) => void;
  onRetryPhoto?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "revealing" | "review">(
    "scanning",
  );
  const [result, setResult] = useState<AnalyzePanelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!photoDataUrl || phase !== "scanning") return;

    let cancelled = false;
    let frame = 0;
    const started = performance.now();

    const tickProgress = (now: number) => {
      if (cancelled) return;
      const elapsed = now - started;
      const eased = Math.min(0.92, 1 - Math.exp(-elapsed / 9000));
      setProgress(Math.round(eased * 100));
      setStepIndex(
        Math.min(
          analysisSteps.length - 1,
          Math.floor(eased * analysisSteps.length),
        ),
      );
      frame = requestAnimationFrame(tickProgress);
    };
    frame = requestAnimationFrame(tickProgress);

    void (async () => {
      try {
        const next = await analyzePanel(photoDataUrl);
        if (cancelled) return;
        cancelAnimationFrame(frame);
        setProgress(100);
        setStepIndex(analysisSteps.length - 1);
        setResult(next);
        setPhase("revealing");
      } catch (err) {
        if (cancelled) return;
        cancelAnimationFrame(frame);
        setProgress(100);
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось проанализировать фото",
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [photoDataUrl, phase]);

  const finishAfterReveal = useCallback(() => {
    if (!result || finishedRef.current) return;
    const unknownCount = result.devices.filter(isRailDeviceUncertain).length;
    const hasOverflow = panelHasRailOverflow(result.devices, result.railCount);
    if (unknownCount > 0 || hasOverflow) {
      setPhase("review");
      return;
    }
    finishedRef.current = true;
    onDone(result);
  }, [onDone, result]);

  const revealCount = useXrayReveal(
    result?.devices.length ?? 0,
    phase === "revealing",
    finishAfterReveal,
  );

  const unknownCount =
    result?.devices.filter(isRailDeviceUncertain).length ?? 0;
  const hasOverflow = result
    ? panelHasRailOverflow(result.devices, result.railCount)
    : false;

  const statusLabel = useMemo(() => {
    if (error) return "Не удалось разобрать фото";
    if (phase === "review") return "Проверьте результат";
    if (phase === "revealing") {
      const n = Math.min(revealCount, result?.devices.length ?? 0);
      return n > 0
        ? `Найдено: ${n} ${deviceWord(n)}`
        : "Подсвечиваем приборы";
    }
    return analysisSteps[stepIndex]?.label ?? "Сканируем щиток";
  }, [error, phase, revealCount, result?.devices.length, stepIndex]);

  if (!photoDataUrl) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-4 px-5"
      >
        <p className="text-center ty-body">Нет фото для анализа.</p>
        {onRetryPhoto && (
          <Button type="button" onClick={() => onRetryPhoto()}>
            Сфотографировать снова
          </Button>
        )}
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] lg:max-w-2xl lg:justify-center"
    >
      <h1 className="mb-2 text-center ty-title">{statusLabel}</h1>
      <p className="mb-5 text-center ty-note text-zinc-500">
        {error
          ? "Попробуйте переснять при лучшем свете"
          : phase === "review"
            ? "Можно переснять или продолжить со схемой"
            : "Рентген-скан: ищем корпуса автоматов на фото"}
      </p>

      <div className="mb-5 w-full">
        <PanelXrayScan
          photoDataUrl={photoDataUrl}
          progress={progress}
          devices={result?.devices}
          scanning={phase === "scanning" && !error}
          revealCount={
            phase === "revealing" || phase === "review"
              ? revealCount || result?.devices.length
              : 0
          }
        />
      </div>

      {error ? (
        <div className="w-full space-y-4">
          <GlassCard className="border border-rose-200 bg-rose-50 p-4">
            <p className="ty-body text-rose-800">{error}</p>
          </GlassCard>
          {onRetryPhoto && (
            <Button
              type="button"
              className="w-full"
              onClick={() => onRetryPhoto()}
            >
              <Camera className="h-4 w-4" />
              Переснять щиток
            </Button>
          )}
        </div>
      ) : phase === "review" && result ? (
        <div className="w-full space-y-4">
          {unknownCount > 0 && (
            <GlassCard className="flex gap-3 border border-amber-200/80 bg-amber-50/90 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="ty-heading text-amber-950">
                  Не все приборы определены
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-amber-900/80">
                  ИИ не уверен в {unknownCount} {deviceWord(unknownCount)}.
                  На схеме они будут помечены. Можно переснять щиток при лучшем
                  свете или открыть схему и поправить карточки.
                </p>
              </div>
            </GlassCard>
          )}

          {hasOverflow && (
            <GlassCard className="flex gap-3 border border-amber-200/80 bg-amber-50/90 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="ty-heading text-amber-950">
                  На рейке больше {MAX_MODULES_PER_RAIL} модулей
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-amber-900/80">
                  На фото приборов больше по ширине, чем {MAX_MODULES_PER_RAIL}{" "}
                  модулей. Лишние устройства на схеме не будут показаны. Если это
                  ошибка распознавания — лучше переснять щиток.
                </p>
              </div>
            </GlassCard>
          )}

          {onRetryPhoto && (
            <Button
              type="button"
              className="w-full"
              onClick={() => onRetryPhoto()}
            >
              <Camera className="h-4 w-4" />
              Переснять щиток
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => onDone(result)}
          >
            Продолжить со схемой
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <motion.div
                  className="h-full rounded-full bg-cyan-600"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                />
              </div>
            </div>
            <span className="shrink-0 text-[13px] tabular-nums text-zinc-600">
              {progress}%
            </span>
          </div>

          <GlassCard className="mb-4 w-full space-y-2.5 p-4">
            {analysisSteps.map((step, i) => {
              const done = i < stepIndex || progress === 100;
              const active = i === stepIndex && progress < 100;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      done
                        ? "bg-cyan-500/15 text-cyan-700"
                        : active
                          ? "bg-zinc-200 text-zinc-700"
                          : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={`text-[14px] ${
                      done || active ? "text-zinc-800" : "text-zinc-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </GlassCard>

          <AnimatePresence>
            {phase === "revealing" && result ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-[14px] text-cyan-800"
              >
                Подсвечиваем {result.devices.length}{" "}
                {deviceWord(result.devices.length)} на снимке…
              </motion.p>
            ) : (
              <p className="text-center ty-meta">
                Не закрывайте приложение во время анализа
              </p>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.section>
  );
}
