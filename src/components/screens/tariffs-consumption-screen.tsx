"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { ApplianceBrandAvatar } from "@/components/ui/appliance-brand-avatar";
import { HouseElectricityTariffCard } from "@/components/ui/house-electricity-tariff-card";
import { applianceNeedsDetails } from "@/lib/appliance-line-sync";
import {
  applianceHourlyCost,
  formatRubPerHour,
} from "@/lib/appliance-power-cost";
import {
  applianceDisplayKindLabel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import type { PanelHouseSnapshot } from "@/lib/house-insight";
import { panelsFromHomeItems } from "@/lib/maintenance/targets";
import type { HomeAppliance, HomeListItem, PanelObject } from "@/types";
import { cn } from "@/lib/utils";

type ApplianceRow = {
  panel: PanelObject;
  appliance: HomeAppliance;
};

export function TariffsConsumptionScreen({
  items,
  onBack,
  onHouseSnapshotChange,
  onOpenAppliance,
  onNeedHouseAddress,
}: {
  items: HomeListItem[];
  onBack: () => void;
  onHouseSnapshotChange?: (
    panelId: string,
    snapshot: PanelHouseSnapshot,
  ) => void;
  onOpenAppliance?: (panelId: string, applianceId: string) => void;
  onNeedHouseAddress?: (panelId: string) => void;
}) {
  const panels = useMemo(() => panelsFromHomeItems(items), [items]);

  const tariffPanel = useMemo(() => {
    return (
      panels.find((panel) => panel.houseSnapshot?.electricityTariff) ??
      panels.find((panel) => panel.houseSnapshot) ??
      panels[0] ??
      null
    );
  }, [panels]);

  const applianceRows = useMemo(() => {
    const rows: ApplianceRow[] = [];
    for (const panel of panels) {
      for (const appliance of panel.appliances ?? []) {
        rows.push({ panel, appliance });
      }
    }
    return rows;
  }, [panels]);

  const snapshot = tariffPanel?.houseSnapshot ?? null;

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
        <div>
          <h1 className="ty-title">Тарифы и потребление</h1>
          <p className="ty-meta text-zinc-500">Ставки региона и расход техники</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5">
        {snapshot && tariffPanel ? (
          <HouseElectricityTariffCard
            snapshot={snapshot}
            onSnapshotChange={(next) =>
              onHouseSnapshotChange?.(tariffPanel.id, next)
            }
          />
        ) : (
          <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Zap className="h-4 w-4" />
              <span className="ty-label uppercase tracking-wide">
                Тариф на электроэнергию
              </span>
            </div>
            <p className="ty-body text-zinc-900">
              Чтобы показать тариф региона, укажите адрес дома в карточке
              щитка.
            </p>
            {tariffPanel && onNeedHouseAddress ? (
              <button
                type="button"
                className="mt-3 w-full rounded-xl bg-zinc-900 px-3 py-2.5 ty-label text-white"
                onClick={() => onNeedHouseAddress(tariffPanel.id)}
              >
                Указать адрес
              </button>
            ) : null}
          </div>
        )}

        <div>
          <h2 className="mb-3 ty-subtitle text-zinc-600">Техника</h2>
          {applianceRows.length === 0 ? (
            <p className="rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-5 ty-note text-zinc-600">
              Пока нет техники, привязанной к щитку. Добавьте её на главной —
              здесь появится расход в ₽/час.
            </p>
          ) : (
            <div className="overflow-hidden rounded-[20px] border border-black/8 bg-white">
              {applianceRows.map(({ panel, appliance }, index) => {
                const brand = appliance.brand?.trim();
                const model = appliance.model?.trim();
                const kindLabel = applianceDisplayKindLabel(appliance);
                const needsDetails = applianceNeedsDetails(appliance);
                const cost = applianceHourlyCost(
                  appliance.powerW,
                  panel.houseSnapshot,
                );
                const powerLabel = formatAppliancePower(appliance.powerW);

                return (
                  <button
                    key={`${panel.id}-${appliance.id}`}
                    type="button"
                    onClick={() =>
                      onOpenAppliance?.(panel.id, appliance.id)
                    }
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                      index > 0 && "border-t border-black/[0.06]",
                    )}
                  >
                    <ApplianceBrandAvatar
                      kind={appliance.kind}
                      brandLogoUrl={appliance.brandLogoUrl}
                      brand={brand}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate ty-label">
                        <span className="font-medium text-zinc-500">
                          {kindLabel}
                        </span>
                        {brand ? <> {brand}</> : null}
                      </span>
                      {model ? (
                        <span className="block truncate ty-meta">{model}</span>
                      ) : null}
                      {powerLabel && powerLabel !== "—" ? (
                        <span className="mt-0.5 block ty-meta text-zinc-500">
                          {powerLabel}
                        </span>
                      ) : null}
                      {panels.length > 1 ? (
                        <span className="mt-0.5 block ty-meta text-zinc-400">
                          {panel.title}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right">
                      {needsDetails ? (
                        <span className="ty-meta text-zinc-400">Нет данных</span>
                      ) : cost ? (
                        <span className="ty-label tabular-nums text-zinc-900">
                          {formatRubPerHour(cost.rubPerHour)}
                        </span>
                      ) : (
                        <span className="ty-meta text-zinc-400">—</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
