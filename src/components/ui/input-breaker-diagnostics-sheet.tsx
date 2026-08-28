"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { Device } from "@/types";
import {
  describeCandidate,
  rankInputBreakerCandidates,
} from "@/lib/input-breaker-diagnostics";
import { cn } from "@/lib/utils";

type Step =
  | "intro"
  | "test"
  | "confirm"
  | "manual"
  | "done";

export function InputBreakerDiagnosticsSheet({
  devices,
  onClose,
  onConfirmInputBreaker,
  onHighlightDevice,
}: {
  devices: Device[];
  onClose: () => void;
  onConfirmInputBreaker: (deviceId: number) => void;
  onHighlightDevice?: (deviceId: number | null) => void;
}) {
  const ranked = useMemo(
    () => rankInputBreakerCandidates(devices),
    [devices],
  );
  const [step, setStep] = useState<Step>("intro");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [manualId, setManualId] = useState<number | null>(null);
  const [confirmedId, setConfirmedId] = useState<number | null>(null);

  const candidate =
    step === "manual" && manualId != null
      ? ranked.find((d) => d.id === manualId) ?? null
      : ranked[candidateIndex] ?? null;

  const selectCandidate = (device: Device) => {
    onHighlightDevice?.(device.id);
  };

  const startTest = () => {
    const first = ranked[0];
    if (!first) {
      setStep("manual");
      return;
    }
    setCandidateIndex(0);
    setManualId(null);
    selectCandidate(first);
    setStep("test");
  };

  const goConfirm = () => setStep("confirm");

  const onYesAllOff = () => {
    if (!candidate) return;
    onConfirmInputBreaker(candidate.id);
    setConfirmedId(candidate.id);
    onHighlightDevice?.(candidate.id);
    setStep("done");
  };

  const onNoStillOn = () => {
    if (step === "manual" || candidateIndex >= ranked.length - 1) {
      onHighlightDevice?.(null);
      setStep("manual");
      return;
    }
    const nextIndex = candidateIndex + 1;
    setCandidateIndex(nextIndex);
    const next = ranked[nextIndex];
    if (next) selectCandidate(next);
    setStep("test");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="max-h-[min(88dvh,720px)] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="ty-title">
              Диагностика вводного автомата
            </h2>
            <p className="mt-1 ty-note">
              По фото нельзя надёжно угадать вводной — подтвердим тестом.
            </p>
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

        {step === "intro" && (
          <div className="space-y-4">
            <GlassCard className="space-y-2 p-4">
              <p className="ty-body text-zinc-700">
                Включим свет и нагрузки в розетках по всему объекту, затем
                отключим предполагаемый вводной. Если погасло всё — это он.
                Если нет — проверим следующий или найдём вручную.
              </p>
              {ranked[0] && (
                <p className="ty-note">
                  Первым предложим:{" "}
                  <span className="font-medium text-zinc-800">
                    {describeCandidate(ranked[0])}
                  </span>
                </p>
              )}
            </GlassCard>
            <Button className="w-full" size="lg" onClick={startTest}>
              Начать проверку
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                onHighlightDevice?.(null);
                setStep("manual");
              }}
            >
              Сразу выбрать прибор вручную
            </Button>
          </div>
        )}

        {step === "test" && candidate && (
          <div className="space-y-4">
            <GlassCard className="space-y-3 p-4">
              <p className="ty-label uppercase tracking-wide text-zinc-400">
                Предполагаемый вводной
              </p>
              <p className="ty-heading">
                {candidate.name}
              </p>
              <p className="ty-body">
                {describeCandidate(candidate)}
              </p>
              <ol className="list-decimal space-y-2 pl-5 ty-body text-zinc-700">
                <li>Включите свет и нагрузки в розетках везде, где возможно.</li>
                <li>
                  На схеме отключите только этот прибор (рычаг вниз) — остальные
                  оставьте включёнными.
                </li>
                <li>Проверьте: погасло ли всё в квартире / доме.</li>
              </ol>
            </GlassCard>
            <Button className="w-full" size="lg" onClick={goConfirm}>
              Я отключил — дальше
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                onHighlightDevice?.(null);
                setStep("manual");
              }}
            >
              Это не тот — выбрать другой
            </Button>
          </div>
        )}

        {step === "confirm" && candidate && (
          <div className="space-y-4">
            <GlassCard className="p-4">
              <p className="ty-body text-zinc-800">
                После отключения{" "}
                <span className="font-semibold">{candidate.name}</span> всё
                погасло и отключилось?
              </p>
            </GlassCard>
            <Button className="w-full" size="lg" onClick={onYesAllOff}>
              Да, всё погасло — это вводной
            </Button>
            <Button className="w-full" variant="secondary" onClick={onNoStillOn}>
              Нет, что-то ещё работает
            </Button>
          </div>
        )}

        {step === "manual" && (
          <div className="space-y-4">
            <p className="ty-body">
              Выберите прибор на списке, включите нагрузки, отключите его и
              проверьте, погасло ли всё. Так же можно открыть карточку прибора на
              схеме.
            </p>
            <div className="max-h-[40vh] space-y-2 overflow-y-auto">
              {ranked.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => {
                    setManualId(device.id);
                    selectCandidate(device);
                    setStep("test");
                  }}
                  className={cn(
                    "w-full rounded-[18px] border px-4 py-3 text-left transition-colors",
                    manualId === device.id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-black/8 bg-white hover:bg-zinc-50",
                  )}
                >
                  <p className="ty-subtitle text-zinc-900">
                    {device.name}
                  </p>
                  <p className="mt-0.5 ty-note">
                    {describeCandidate(device)}
                  </p>
                </button>
              ))}
            </div>
            {ranked.length === 0 && (
              <p className="ty-body">
                Автоматов на схеме пока нет — сначала проверьте оцифровку.
              </p>
            )}
          </div>
        )}

        {step === "done" && confirmedId != null && (
          <div className="space-y-4">
            <GlassCard className="space-y-2 bg-emerald-50 p-4">
              <p className="ty-heading text-emerald-950">
                Вводной автомат найден
              </p>
              <p className="ty-body text-emerald-900/85">
                Прибор подписан как «Ввод». Чтобы подписать остальные линии,
                откройте карточку каждого прибора на схеме и заполните данные /
                определите линию там.
              </p>
            </GlassCard>
            <Button className="w-full" size="lg" onClick={onClose}>
              Понятно
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
