"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hammer, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableSection } from "@/components/ui/expandable-section";
import { GlassCard } from "@/components/ui/glass-card";
import {
  estimateElectricalInstallCost,
  formatEstimateRub,
  type DwellingKind,
} from "@/lib/no-panel-estimates";

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="ty-note text-zinc-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg text-zinc-900"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Уменьшить ${label}`}
        >
          −
        </button>
        <span className="min-w-[4.5rem] text-center ty-heading tabular-nums text-zinc-900">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg text-zinc-900"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Увеличить ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ElectricalInstallLandingScreen({
  onBack,
  onOrder,
}: {
  onBack: () => void;
  onOrder: () => void;
}) {
  const [areaM2, setAreaM2] = useState(55);
  const [rooms, setRooms] = useState(2);
  const [pointsPerRoom, setPointsPerRoom] = useState(8);
  const [dwelling, setDwelling] = useState<DwellingKind>("apartment");
  const [withPanel, setWithPanel] = useState(true);

  const estimate = useMemo(
    () =>
      estimateElectricalInstallCost({
        areaM2,
        rooms,
        pointsPerRoom,
        dwelling,
        withPanel,
      }),
    [areaM2, rooms, pointsPerRoom, dwelling, withPanel],
  );

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <header className="mb-3 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title">Монтаж по проекту</h1>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        <div className="rounded-[18px] border border-black/8 bg-[#D3DA00]/30 p-4">
          <p className="ty-heading text-zinc-900">
            Есть проект — монтируем по нему
          </p>
          <p className="mt-2 ty-note text-zinc-700">
            Током собирает трассы, точки и щиток так, как заложено в документации.
            Меньше споров на объекте и понятный результат.
          </p>
        </div>

        <ExpandableSection
          title="Как работаем"
          defaultOpen
          icon={<Hammer className="h-4 w-4" />}
        >
          Сверяем проект с объектом, размечаем трассы, монтируем кабель и щиток,
          проверяем защиту и подписываем акт.
        </ExpandableSection>
        <ExpandableSection
          title="Если проект чужой"
          icon={<ShieldCheck className="h-4 w-4" />}
        >
          Можем смонтировать по вашему проекту или предложить точечные правки,
          если схема небезопасна или не закрывает нагрузки.
        </ExpandableSection>

        <GlassCard className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-zinc-500" />
            <p className="ty-heading text-zinc-900">Калькулятор монтажа</p>
          </div>
          <p className="mb-3 ty-note text-zinc-500">
            Грубая оценка «под ключ». Финальная смета — после выезда/сметы.
          </p>

          <div className="mb-2 flex gap-2">
            {(
              [
                ["apartment", "Квартира"],
                ["house", "Дом"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDwelling(id)}
                className={
                  dwelling === id
                    ? "flex-1 rounded-full bg-[#111113] px-3 py-2 text-[13px] font-semibold text-white"
                    : "flex-1 rounded-full border border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700"
                }
              >
                {label}
              </button>
            ))}
          </div>

          <Stepper
            label="Площадь"
            value={areaM2}
            min={20}
            max={300}
            step={5}
            suffix="м²"
            onChange={setAreaM2}
          />
          <Stepper
            label="Комнаты"
            value={rooms}
            min={1}
            max={10}
            onChange={setRooms}
          />
          <Stepper
            label="Точек в комнате"
            value={pointsPerRoom}
            min={4}
            max={14}
            onChange={setPointsPerRoom}
          />

          <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-[14px] border border-black/8 bg-white px-3 py-3">
            <input
              type="checkbox"
              checked={withPanel}
              onChange={(e) => setWithPanel(e.target.checked)}
              className="h-4 w-4 accent-zinc-800"
            />
            <span className="ty-note text-zinc-800">
              В смете — сборка и установка щитка
            </span>
          </label>

          <div className="mt-3 rounded-[14px] bg-zinc-100 px-4 py-3">
            <p className="ty-note text-zinc-500">Ориентир стоимости монтажа</p>
            <p className="ty-title text-zinc-900">
              {formatEstimateRub(estimate.totalRub)}
            </p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {estimate.breakdown.map((row) => (
              <li
                key={row.label}
                className="flex justify-between gap-3 ty-note text-zinc-600"
              >
                <span>{row.label}</span>
                <span className="shrink-0 tabular-nums">
                  {formatEstimateRub(row.amountRub)}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <div className="shrink-0 pt-1">
        <Button className="w-full" onClick={onOrder}>
          Заказать монтаж
        </Button>
      </div>
    </motion.section>
  );
}
