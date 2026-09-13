"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { formatRubPerKwh } from "@/lib/electricity-tariffs-format";
import type { TariffMeterType } from "@/lib/electricity-tariffs-format";
import type {
  HouseElectricityTariffRates,
  PanelHouseSnapshot,
} from "@/lib/house-insight";
import { cn } from "@/lib/utils";

const METER_OPTIONS: Array<{ id: TariffMeterType; label: string }> = [
  { id: "single", label: "Однотарифный" },
  { id: "dual", label: "Двухтарифный" },
  { id: "triple", label: "Трёхтарифный" },
  { id: "custom", label: "Свои ставки" },
];

function RateRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="ty-note text-zinc-600">{label}</span>
      <span className="ty-body font-medium text-zinc-900 tabular-nums">
        {formatRubPerKwh(value)}
      </span>
    </div>
  );
}

function pickRates(
  snapshot: PanelHouseSnapshot,
  electricStove: boolean,
): { rates: HouseElectricityTariffRates | null; groupLabel: string } {
  const t = snapshot.electricityTariff;
  if (!t) return { rates: null, groupLabel: "" };
  if (electricStove) {
    return {
      rates: t.urbanElectricStove,
      groupLabel: "Город, дома с электроплитами",
    };
  }
  return { rates: t.urban, groupLabel: "Город (газ / без электроплит)" };
}

export function HouseElectricityTariffCard({
  snapshot,
  onSnapshotChange,
  className,
}: {
  snapshot: PanelHouseSnapshot;
  onSnapshotChange?: (next: PanelHouseSnapshot) => void;
  className?: string;
}) {
  const [meterType, setMeterType] = useState<TariffMeterType>(
    snapshot.meterType ?? "single",
  );
  const [electricStove, setElectricStove] = useState(
    snapshot.electricStove === true,
  );
  const [customSingle, setCustomSingle] = useState(
    snapshot.customRates?.single != null
      ? String(snapshot.customRates.single)
      : "",
  );
  const [customDay, setCustomDay] = useState(
    snapshot.customRates?.day != null ? String(snapshot.customRates.day) : "",
  );
  const [customNight, setCustomNight] = useState(
    snapshot.customRates?.night != null
      ? String(snapshot.customRates.night)
      : "",
  );

  useEffect(() => {
    setMeterType(snapshot.meterType ?? "single");
    setElectricStove(snapshot.electricStove === true);
    setCustomSingle(
      snapshot.customRates?.single != null
        ? String(snapshot.customRates.single)
        : "",
    );
    setCustomDay(
      snapshot.customRates?.day != null ? String(snapshot.customRates.day) : "",
    );
    setCustomNight(
      snapshot.customRates?.night != null
        ? String(snapshot.customRates.night)
        : "",
    );
  }, [snapshot]);

  const { rates, groupLabel } = useMemo(
    () => pickRates(snapshot, electricStove),
    [snapshot, electricStove],
  );
  const tariff = snapshot.electricityTariff;

  const persist = (patch: Partial<PanelHouseSnapshot>) => {
    onSnapshotChange?.({
      ...snapshot,
      meterType,
      electricStove,
      ...patch,
    });
  };

  const parseCustom = (raw: string): number | null => {
    const n = Number(raw.replace(",", ".").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return (
    <div
      className={cn(
        "rounded-[20px] border border-black/8 bg-zinc-50 p-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-zinc-500">
        <Zap className="h-4 w-4" />
        <span className="ty-label uppercase tracking-wide">
          Тариф на электроэнергию
        </span>
      </div>

      {tariff && rates ? (
        <>
          <p className="ty-body text-zinc-900">{tariff.regionLabel}</p>
          <p className="mt-1 ty-note text-zinc-600">
            Действует {tariff.periodLabel}
            {tariff.rangeCount > 1
              ? " · показан 1-й диапазон потребления"
              : ""}
          </p>
          <p className="mt-1 ty-note text-zinc-600">{groupLabel}</p>

          <label className="mt-3 flex items-center gap-2 ty-note text-zinc-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={electricStove}
              onChange={(e) => {
                const next = e.target.checked;
                setElectricStove(next);
                persist({ electricStove: next });
              }}
            />
            В доме электроплита / электроотопление
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {METER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setMeterType(opt.id);
                  persist({ meterType: opt.id });
                }}
                className={cn(
                  "rounded-2xl border px-3 py-2 text-left ty-note transition-colors",
                  meterType === opt.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-black/10 bg-white text-zinc-800",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-black/6 bg-white px-3 py-2">
            {meterType === "single" ? (
              <RateRow label="Одноставочный" value={rates.single} />
            ) : null}
            {meterType === "dual" ? (
              <>
                <RateRow label="День" value={rates.dualDay} />
                <RateRow label="Ночь" value={rates.dualNight} />
              </>
            ) : null}
            {meterType === "triple" ? (
              <>
                <RateRow label="Пик" value={rates.triplePeak} />
                <RateRow label="Полупик" value={rates.tripleMid} />
                <RateRow label="Ночь" value={rates.tripleNight} />
              </>
            ) : null}
            {meterType === "custom" ? (
              <div className="flex flex-col gap-2 py-1">
                <p className="ty-note text-zinc-600">
                  Укажите свои ставки (льготы) в ₽/кВт·ч
                </p>
                {(
                  [
                    ["Одноставочный", customSingle, setCustomSingle],
                    ["День", customDay, setCustomDay],
                    ["Ночь", customNight, setCustomNight],
                  ] as const
                ).map(([label, value, setValue]) => (
                  <label
                    key={label}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="ty-note">{label}</span>
                    <input
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onBlur={() =>
                        persist({
                          customRates: {
                            single: parseCustom(customSingle),
                            day: parseCustom(customDay),
                            night: parseCustom(customNight),
                          },
                        })
                      }
                      className="w-28 rounded-xl border border-black/10 px-2 py-1 text-right ty-body"
                      placeholder="0,00"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <p className="mt-2 ty-meta text-zinc-500">
            Источник: elec.ru
            {tariff.sourceDoc ? ` · ${tariff.sourceDoc}` : ""}
          </p>
        </>
      ) : (
        <p className="ty-note text-zinc-700">
          Тарифы для этого региона пока не найдены. Можно указать свои ставки
          вручную после выбора адреса в известном регионе.
        </p>
      )}
    </div>
  );
}
