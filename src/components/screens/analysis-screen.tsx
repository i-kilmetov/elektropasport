"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  analysisSteps,
} from "@/lib/mock-data";
import { buildRandomPanel } from "@/lib/device-catalog";
import type { AnalyzePanelResult } from "@/types";

export function AnalysisScreen({
  photoDataUrl,
  onDone,
}: {
  photoDataUrl?: string | null;
  onDone: (result: AnalyzePanelResult) => void;
  onRetryPhoto?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [foundCount, setFoundCount] = useState(0);

  useEffect(() => {
    const totalMs = 4200;
    const start = performance.now();
    let frame = 0;
    let doneTimer = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / totalMs);
      const eased = 1 - Math.pow(1 - t, 2.4);
      setProgress(Math.round(eased * 100));
      setStepIndex(
        Math.min(analysisSteps.length - 1, Math.floor(eased * analysisSteps.length)),
      );
      // Generate random panel once when analysis "completes"
      const estimatedDevices = 8; // just for progress animation
      setFoundCount(
        Math.min(estimatedDevices, Math.floor(eased * estimatedDevices)),
      );

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        doneTimer = window.setTimeout(() => {
          const panel = buildRandomPanel();
          onDone({
            devices: panel.devices,
            safetyScore: panel.safetyScore,
            linesCount: panel.linesCount,
            railCount: panel.railCount,
          });
        }, 450);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  const foundDevices = useMemo(
    () => Array.from({ length: Math.max(0, foundCount) }, (_, i) => ({
      id: i,
      type: "breaker" as const,
      name: `Прибор ${i + 1}`,
      rating: "—",
      status: "pending" as const,
    })),
    [foundCount],
  );

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] lg:max-w-2xl lg:justify-center"
    >
      <h1 className="mb-6 text-center text-[22px] font-semibold text-zinc-900">
        Анализируем изображение
      </h1>

      {photoDataUrl && (
        <div className="mb-8 h-16 w-16 overflow-hidden rounded-[14px] border border-black/10 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoDataUrl}
            alt="Ваше фото щитка"
            className="h-full w-full object-cover"
          />
        </div>
      )}

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
            animate={{ strokeDashoffset: 2 * Math.PI * 68 * (1 - progress / 100) }}
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
            {foundCount}
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
    </motion.section>
  );
}
