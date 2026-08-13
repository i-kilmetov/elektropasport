"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Home, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export type DwellingType = "apartment" | "house";
export type PhaseCount = "1" | "3";

export interface ElectricalDetails {
  dwelling: DwellingType;
  phases: PhaseCount;
  powerKw: string;
}

const powerHints = [
  "3–5 кВт — старый фонд, минимум техники",
  "5–7 кВт — типичная квартира",
  "10–15 кВт — квартира с мощной техникой / частный дом",
  "15+ кВт — дом с электроплитой, тёплым полом, зарядкой авто",
];

export function ElectricalDetailsScreen({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: (details: ElectricalDetails) => void;
}) {
  const [dwelling, setDwelling] = useState<DwellingType | null>(null);
  const [phases, setPhases] = useState<PhaseCount | null>(null);
  const [powerKw, setPowerKw] = useState("");
  const [powerError, setPowerError] = useState<string | null>(null);

  const canContinue =
    dwelling !== null &&
    phases !== null &&
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
    if (!Number.isFinite(num)) {
      setPowerError(null);
      return;
    }
    if (num > 50) {
      setPowerError(
        "Если у вас квартира или частный дом, такой мощности скорее всего быть не может. Пожалуйста, проверьте значение.",
      );
      return;
    }
    setPowerError(null);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">О вашей сети</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        Уточните параметры электрики
      </h2>
      <p className="mb-6 text-[15px] leading-relaxed text-zinc-500">
        Это поможет корректно подобрать щиток и защиту под ваш объект.
      </p>

      <div className="flex-1 space-y-6 overflow-y-auto pb-4">
        <div>
          <div className="mb-3 text-[14px] font-medium text-zinc-600">Объект</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDwelling("apartment")}
              className={cn(
                "rounded-[20px] border p-4 text-left transition-colors",
                dwelling === "apartment"
                  ? "border-[var(--accent)]/50 bg-[var(--accent)]/15"
                  : "border-black/8 bg-zinc-50",
              )}
            >
              <Building2 className="mb-2 h-5 w-5 text-[var(--accent)]" />
              <div className="text-[15px] font-semibold text-zinc-900">Квартира</div>
            </button>
            <button
              type="button"
              onClick={() => setDwelling("house")}
              className={cn(
                "rounded-[20px] border p-4 text-left transition-colors",
                dwelling === "house"
                  ? "border-[var(--accent)]/50 bg-[var(--accent)]/15"
                  : "border-black/8 bg-zinc-50",
              )}
            >
              <Home className="mb-2 h-5 w-5 text-emerald-600" />
              <div className="text-[15px] font-semibold text-zinc-900">Дом</div>
            </button>
          </div>
        </div>

        <div>
          <div className="mb-3 text-[14px] font-medium text-zinc-600">
            Сколько фаз приходит
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["1", "1 фаза"],
                ["3", "3 фазы"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPhases(value)}
                className={cn(
                  "rounded-[20px] border px-4 py-4 text-[15px] font-semibold transition-colors",
                  phases === value
                    ? "border-[var(--accent)]/50 bg-[var(--accent)]/15 text-zinc-900"
                    : "border-black/8 bg-zinc-50 text-zinc-700",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">
            Обычно видно по числу проводов на вводе или по маркировке счётчика
            (однофазный / трёхфазный).
          </p>
        </div>

        <div>
          <div className="mb-3 text-[14px] font-medium text-zinc-600">
            Выделенная мощность, кВт
          </div>
          <input
            inputMode="decimal"
            value={powerKw}
            onChange={(e) => onPowerChange(e.target.value)}
            placeholder="Например, 7"
            className="h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
          />
          {powerError && (
            <p className="mt-2 text-[13px] leading-relaxed text-rose-600">
              {powerError}
            </p>
          )}
          <GlassCard className="mt-3 space-y-2 p-4">
            <div className="flex items-start gap-2 text-[13px] text-zinc-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span>Где узнать выделенную мощность</span>
            </div>
            <ul className="space-y-1.5 pl-1 text-[13px] leading-relaxed text-zinc-500">
              <li>• в договоре с энергосбытом / УК</li>
              <li>• в акте технологического присоединения</li>
              <li>• в личном кабинете энергокомпании</li>
            </ul>
            <div className="border-t border-black/[0.06] pt-2 text-[12px] text-zinc-400">
              {powerHints.map((hint) => (
                <div key={hint} className="py-0.5">
                  {hint}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <Button
          className="w-full"
          size="lg"
          disabled={!canContinue}
          onClick={() => {
            if (!dwelling || !phases) return;
            onContinue({
              dwelling,
              phases,
              powerKw: powerKw.trim().replace(",", "."),
            });
          }}
        >
          Далее
        </Button>
      </div>
    </motion.section>
  );
}
