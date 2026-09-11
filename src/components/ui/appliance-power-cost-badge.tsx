"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  applianceHourlyCost,
  formatRubPerHour,
  houseMeterTypeReady,
  houseTariffReady,
} from "@/lib/appliance-power-cost";
import { formatRubPerKwh } from "@/lib/electricity-tariffs-format";
import type { TariffMeterType } from "@/lib/electricity-tariffs-format";
import type { PanelHouseSnapshot } from "@/lib/house-insight";
import { cn } from "@/lib/utils";
import { formatAppliancePower } from "@/lib/home-appliances";

const METER_CHIPS: Array<{ id: TariffMeterType; label: string }> = [
  { id: "single", label: "Однотарифный" },
  { id: "dual", label: "Двухтарифный" },
  { id: "triple", label: "Трёхтарифный" },
];

export function AppliancePowerCostBadge({
  powerW,
  snapshot,
  onSnapshotChange,
  onNeedAddress,
}: {
  powerW?: number;
  snapshot?: PanelHouseSnapshot | null;
  onSnapshotChange?: (next: PanelHouseSnapshot) => void;
  /** Open house address flow when tariffs are missing. */
  onNeedAddress?: () => void;
}) {
  const tipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const visible = open || hovered;

  const cost = applianceHourlyCost(powerW, snapshot);
  const hasTariff = houseTariffReady(snapshot);
  const hasMeter = houseMeterTypeReady(snapshot);
  const powerLabel = formatAppliancePower(powerW);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent | TouchEvent) => {
      const node = rootRef.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const pickMeter = (meterType: TariffMeterType) => {
    if (!snapshot) return;
    onSnapshotChange?.({ ...snapshot, meterType });
  };

  return (
    <span
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-describedby={visible ? tipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setOpen((v) => !v);
        }}
        className={cn(
          "ty-label tabular-nums text-zinc-700 underline decoration-dotted decoration-zinc-300 underline-offset-4 transition-colors",
          "hover:text-zinc-900 hover:decoration-zinc-500",
          open && "text-zinc-900 decoration-zinc-500",
        )}
      >
        {powerLabel}
      </button>

      {visible ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute right-0 bottom-[calc(100%+6px)] z-30 w-[min(16.5rem,calc(100vw-2.5rem))] rounded-2xl border border-black/8 bg-white p-3 text-left shadow-[0_12px_40px_rgba(17,17,19,0.16)]"
          onClick={(event) => event.stopPropagation()}
        >
          {cost ? (
            <>
              <p className="ty-title text-zinc-900">
                ≈ {formatRubPerHour(cost.rubPerHour)}
              </p>
              <p className="mt-1 ty-note text-zinc-600">
                При полной мощности {powerLabel} ·{" "}
                {formatRubPerKwh(cost.rubPerKwh)} ({cost.rateLabel})
              </p>
            </>
          ) : !hasTariff ? (
            <>
              <p className="ty-body text-zinc-900">
                Чтобы показать стоимость, нужен тариф по адресу дома
              </p>
              <p className="mt-1 ty-note text-zinc-600">
                Укажите адрес в карточке щитка — подтянем ставки региона.
              </p>
              {onNeedAddress ? (
                <button
                  type="button"
                  className="mt-2.5 w-full rounded-xl bg-zinc-900 px-3 py-2 ty-label text-white"
                  onClick={() => {
                    setOpen(false);
                    onNeedAddress();
                  }}
                >
                  Указать адрес
                </button>
              ) : null}
            </>
          ) : !hasMeter ? (
            <>
              <p className="ty-body text-zinc-900">Какой у вас счётчик?</p>
              <p className="mt-1 ty-note text-zinc-600">
                От типа зависит ставка — покажем расход в ₽/час.
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-1.5">
                {METER_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className="rounded-xl border border-black/10 bg-zinc-50 px-3 py-2 text-left ty-label text-zinc-800 transition-colors hover:bg-zinc-100"
                    onClick={() => pickMeter(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="ty-note text-zinc-600">
              Не удалось посчитать стоимость по текущему тарифу.
            </p>
          )}
        </span>
      ) : null}
    </span>
  );
}
