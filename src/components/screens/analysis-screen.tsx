"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { analysisSteps, devices } from "@/lib/mock-data";

export function AnalysisScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [foundCount, setFoundCount] = useState(0);

  useEffect(() => {
    const totalMs = 4200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / totalMs);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const next = Math.round(eased * 100);
      setProgress(next);
      setStepIndex(Math.min(analysisSteps.length - 1, Math.floor(eased * analysisSteps.length)));
      setFoundCount(Math.min(devices.length, Math.floor(eased * devices.length)));

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setTimeout(onDone, 450);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onDone]);

  const foundDevices = useMemo(
    () => devices.slice(0, Math.max(1, foundCount)),
    [foundCount],
  );

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-dvh flex-col items-center px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]"
    >
      <h1 className="mb-10 text-center text-[22px] font-semibold text-white">
        Анализируем изображение
      </h1>

      <div className="relative mb-10 flex h-44 w-44 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <motion.circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 68}
            animate={{ strokeDashoffset: 2 * Math.PI * 68 * (1 - progress / 100) }}
            transition={{ ease: "easeOut", duration: 0.2 }}
            style={{ filter: "drop-shadow(0 0 12px rgba(124,92,255,0.55))" }}
          />
        </svg>
        <div className="text-center">
          <div className="text-[40px] font-bold tabular-nums text-white">
            {progress}%
          </div>
          <div className="text-[13px] text-white/45">завершено</div>
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
                    ? "bg-emerald-500/20 text-emerald-400"
                    : active
                      ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                      : "bg-white/5 text-white/30"
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
                  done || active ? "text-white/90" : "text-white/35"
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
          <h2 className="text-[15px] font-medium text-white/70">
            Найденные устройства
          </h2>
          <span className="text-[13px] tabular-nums text-[var(--accent)]">
            {foundCount}/{devices.length}
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
                <span className="text-white/85">{device.name}</span>
                <span className="text-white/40">{device.rating}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </GlassCard>

      <p className="mt-8 text-center text-[13px] text-white/35">
        Не закрывайте приложение во время анализа
      </p>
    </motion.section>
  );
}
