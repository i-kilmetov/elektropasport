"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { analysisSteps } from "@/lib/mock-data";
import { analyzePanel } from "@/lib/analyze-panel";
import {
  MAX_MODULES_PER_RAIL,
  panelHasRailOverflow,
} from "@/lib/panel-rails";
import type { AnalyzePanelResult } from "@/types";

function deviceWord(count: number): string {
  if (count === 1) return "прибор";
  if (count < 5) return "прибора";
  return "приборов";
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
  const [foundCount, setFoundCount] = useState(0);
  const [review, setReview] = useState<AnalyzePanelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (review || !photoDataUrl) return;

    let cancelled = false;
    let frame = 0;
    const started = performance.now();

    const tickProgress = (now: number) => {
      if (cancelled) return;
      // Soft progress while waiting for Qwen (usually 8–25s).
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
        const result = await analyzePanel(photoDataUrl);
        if (cancelled) return;
        cancelAnimationFrame(frame);
        setProgress(100);
        setStepIndex(analysisSteps.length - 1);
        setFoundCount(result.devices.length);

        const unknownCount = result.devices.filter(
          (device) => device.status === "unknown",
        ).length;
        const hasOverflow = panelHasRailOverflow(
          result.devices,
          result.railCount,
        );
        if (unknownCount > 0 || hasOverflow) {
          setReview(result);
          return;
        }
        onDone(result);
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
  }, [onDone, photoDataUrl, review]);

  const foundDevices = useMemo(() => {
    if (review) {
      return review.devices.slice(0, 12).map((device) => ({
        id: device.id,
        name: device.name,
        rating: device.rating,
      }));
    }
    return Array.from({ length: Math.max(0, foundCount) }, (_, i) => ({
      id: i,
      name: `Прибор ${i + 1}`,
      rating: "—",
    }));
  }, [foundCount, review]);

  const unknownCount =
    review?.devices.filter((device) => device.status === "unknown").length ?? 0;
  const hasOverflow = review
    ? panelHasRailOverflow(review.devices, review.railCount)
    : false;

  if (!photoDataUrl) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-4 px-5"
      >
        <p className="text-center text-[15px] text-zinc-500">
          Нет фото для анализа.
        </p>
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
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] lg:max-w-2xl lg:justify-center"
    >
      <h1 className="mb-6 text-center text-[22px] font-semibold text-zinc-900">
        {error
          ? "Не удалось разобрать фото"
          : review
            ? "Проверьте результат"
            : "Анализируем изображение"}
      </h1>

      <div className="mb-8 h-16 w-16 overflow-hidden rounded-[14px] border border-black/10 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoDataUrl}
          alt="Ваше фото щитка"
          className="h-full w-full object-cover"
        />
      </div>

      {error ? (
        <div className="w-full max-w-sm space-y-4">
          <GlassCard className="border border-rose-200 bg-rose-50 p-4">
            <p className="text-[14px] leading-relaxed text-rose-800">{error}</p>
          </GlassCard>
          {onRetryPhoto && (
            <Button type="button" className="w-full" onClick={() => onRetryPhoto()}>
              <Camera className="h-4 w-4" />
              Переснять щиток
            </Button>
          )}
        </div>
      ) : review ? (
        <div className="w-full max-w-sm space-y-4">
          {unknownCount > 0 && (
            <GlassCard className="flex gap-3 border border-amber-200/80 bg-amber-50/90 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-amber-950">
                  Не все приборы определены
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-amber-900/80">
                  ИИ не смог распознать {unknownCount} {deviceWord(unknownCount)}.
                  Сделайте новое фото при хорошем освещении — так схема получится
                  точнее.
                </p>
              </div>
            </GlassCard>
          )}

          {hasOverflow && (
            <GlassCard className="flex gap-3 border border-amber-200/80 bg-amber-50/90 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-amber-950">
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
            onClick={() => onDone(review)}
          >
            Продолжить со схемой
          </Button>
        </div>
      ) : (
        <>
          <div className="relative mb-10 flex h-44 w-44 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="rgba(17,17,19,0.08)"
                strokeWidth="10"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="#3f3f46"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 68}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 68 * (1 - progress / 100),
                }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </svg>
            <div className="text-center">
              <div className="text-[40px] font-bold tabular-nums text-zinc-900">
                {progress}%
              </div>
              <div className="text-[13px] text-zinc-500">завершено</div>
            </div>
          </div>

          <GlassCard className="mb-6 w-full max-w-sm space-y-3 p-5">
            {analysisSteps.map((step, i) => {
              const done = i < stepIndex || progress === 100;
              const active = i === stepIndex && progress < 100;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      done
                        ? "bg-emerald-500/15 text-emerald-600"
                        : active
                          ? "bg-zinc-200 text-zinc-700"
                          : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={`text-[15px] ${
                      done || active ? "text-zinc-800" : "text-zinc-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </GlassCard>

          <GlassCard className="w-full max-w-sm p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-zinc-600">
                Найденные устройства
              </h2>
              <span className="text-[13px] tabular-nums text-zinc-600">
                {foundCount || "…"}
              </span>
            </div>
            <ul className="max-h-40 space-y-2 overflow-hidden">
              <AnimatePresence initial={false}>
                {foundDevices.map((device) => (
                  <motion.li
                    key={device.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center justify-between text-[14px]"
                  >
                    <span className="text-zinc-800">{device.name}</span>
                    <span className="text-zinc-500">{device.rating}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </GlassCard>

          <p className="mt-8 text-center text-[13px] text-zinc-400">
            Не закрывайте приложение во время анализа
          </p>
        </>
      )}
    </motion.section>
  );
}
