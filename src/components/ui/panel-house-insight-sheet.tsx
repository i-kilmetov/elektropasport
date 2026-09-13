"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Cable, Shield, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { formatRubPerKwh } from "@/lib/electricity-tariffs-format";
import type { TariffMeterType } from "@/lib/electricity-tariffs-format";
import {
  formatBuildingYear,
  type HouseElectricityTariffRates,
  type PanelHouseSnapshot,
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

export function PanelHouseInsightSheet({
  open,
  snapshot,
  onClose,
  onChangeAddress,
  onSnapshotChange,
}: {
  open: boolean;
  snapshot: PanelHouseSnapshot;
  onClose: () => void;
  onChangeAddress: () => void;
  onSnapshotChange?: (next: PanelHouseSnapshot) => void;
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

  const { rates, groupLabel } = useMemo(
    () => pickRates(snapshot, electricStove),
    [snapshot, electricStove],
  );
  const tariff = snapshot.electricityTariff;

  if (!open) return null;

  const groundingTone =
    snapshot.groundingExpectation === "expected"
      ? "bg-emerald-50 text-emerald-950"
      : snapshot.groundingExpectation === "uncertain"
        ? "bg-amber-50 text-amber-950"
        : snapshot.groundingExpectation === "none"
          ? "bg-rose-50 text-rose-950"
          : "bg-zinc-100 text-zinc-900";

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
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="ty-title">Дом и сети</h3>
              <p className="mt-1 ty-body">{snapshot.address}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Building2 className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Год постройки
                </span>
              </div>
              <p className="ty-heading text-zinc-900">
                {formatBuildingYear(snapshot.buildingYear)}
              </p>
              {snapshot.walls ? (
                <p className="mt-1 ty-note">{snapshot.walls}</p>
              ) : null}
              {(snapshot.floors != null || snapshot.flats != null) && (
                <p className="mt-1 ty-note">
                  {[
                    snapshot.floors != null ? `${snapshot.floors} эт.` : null,
                    snapshot.flats != null ? `${snapshot.flats} кв.` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {snapshot.dataSource ? (
                <p className="mt-1 ty-meta">Источник: {snapshot.dataSource}</p>
              ) : null}
            </div>

            {snapshot.managementName ? (
              <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  <Building2 className="h-4 w-4" />
                  <span className="ty-label uppercase tracking-wide">УК</span>
                </div>
                <p className="ty-body font-medium text-zinc-900">
                  {snapshot.managementName}
                </p>
                {(snapshot.managementInn || snapshot.managementOgrn) && (
                  <p className="mt-2 ty-note text-zinc-700">
                    {[
                      snapshot.managementInn
                        ? `ИНН ${snapshot.managementInn}`
                        : null,
                      snapshot.managementOgrn
                        ? `ОГРН ${snapshot.managementOgrn}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {snapshot.managementPhone ? (
                  <p className="mt-2">
                    <a
                      href={`tel:${snapshot.managementPhone.replace(/[^\d+]/g, "")}`}
                      className="ty-body text-zinc-900 underline underline-offset-2"
                    >
                      {snapshot.managementPhone}
                    </a>
                  </p>
                ) : null}
                {snapshot.managementEmail ? (
                  <p className="mt-1">
                    <a
                      href={`mailto:${snapshot.managementEmail}`}
                      className="ty-note text-zinc-800 underline underline-offset-2 break-all"
                    >
                      {snapshot.managementEmail}
                    </a>
                  </p>
                ) : null}
                {!snapshot.managementPhone &&
                !snapshot.managementEmail &&
                !snapshot.managementInn &&
                !snapshot.managementOgrn ? (
                  <p className="mt-2 ty-note text-zinc-600">
                    Контакты УК в открытых данных не найдены
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className={cn("rounded-[20px] p-4", groundingTone)}>
              <div className="mb-2 flex items-center gap-2 opacity-70">
                <Shield className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Заземление
                </span>
              </div>
              <p className="ty-title leading-snug">{snapshot.groundingTitle}</p>
              <p className="mt-2 ty-body opacity-90">
                {snapshot.groundingSummary}
              </p>
            </div>

            {(snapshot.capitalRepairMessage ||
              snapshot.electricalOverhaulLastYear != null ||
              snapshot.electricalOverhaulNextYear != null) && (
              <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-500">
                  <Zap className="h-4 w-4" />
                  <span className="ty-label uppercase tracking-wide">
                    Сети электроснабжения
                  </span>
                </div>
                {snapshot.capitalRepairMessage ? (
                  <p className="ty-body text-zinc-800">
                    {snapshot.capitalRepairMessage}
                  </p>
                ) : (
                  <p className="ty-body text-zinc-800">
                    {[
                      snapshot.electricalOverhaulLastYear != null
                        ? `Ремонт был в ${snapshot.electricalOverhaulLastYear} г.`
                        : null,
                      snapshot.electricalOverhaulNextYear != null
                        ? `В программе на ${snapshot.electricalOverhaulNextYear} г.`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
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
                  Тарифы для этого региона пока не найдены. Можно указать свои
                  ставки вручную после выбора адреса в известном регионе.
                </p>
              )}
            </div>

            <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Cable className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Важно
                </span>
              </div>
              <p className="ty-note text-zinc-700">
                Оценка по открытым данным программы капремонта и году постройки.
                Точное состояние вводного кабеля и щитка видно только на месте.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button type="button" className="w-full" onClick={onClose}>
              Понятно
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onChangeAddress}
            >
              Изменить адрес
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
