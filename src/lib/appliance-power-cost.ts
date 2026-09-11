/** Client-safe helpers for appliance power cost (no node:fs). */

import type { TariffMeterType } from "@/lib/electricity-tariffs-format";
import { formatRubPerKwh } from "@/lib/electricity-tariffs-format";
import type {
  HouseElectricityTariffRates,
  PanelHouseSnapshot,
} from "@/lib/house-insight";

export type { TariffMeterType };

export type ApplianceHourlyCost = {
  rubPerHour: number;
  rubPerKwh: number;
  rateLabel: string;
  meterType: TariffMeterType;
};

function pickGroupRates(
  snapshot: PanelHouseSnapshot,
): HouseElectricityTariffRates | null {
  const tariff = snapshot.electricityTariff;
  if (!tariff) return null;
  if (snapshot.electricStove === true) return tariff.urbanElectricStove;
  return tariff.urban;
}

/** Active ₽/kWh for cost-at-power estimates (day / mid / single / custom). */
export function resolveActiveRubPerKwh(
  snapshot: PanelHouseSnapshot | null | undefined,
): { rubPerKwh: number; rateLabel: string; meterType: TariffMeterType } | null {
  if (!snapshot?.meterType) return null;
  const meterType = snapshot.meterType;

  if (meterType === "custom") {
    const custom =
      snapshot.customRates?.single ?? snapshot.customRates?.day ?? null;
    if (custom == null || !Number.isFinite(custom) || custom <= 0) return null;
    return { rubPerKwh: custom, rateLabel: "своя ставка", meterType };
  }

  const rates = pickGroupRates(snapshot);
  if (!rates) return null;

  if (meterType === "single") {
    if (rates.single == null) return null;
    return { rubPerKwh: rates.single, rateLabel: "одноставочный", meterType };
  }
  if (meterType === "dual") {
    if (rates.dualDay == null) return null;
    return { rubPerKwh: rates.dualDay, rateLabel: "день", meterType };
  }
  // triple — полупик ≈ база одноставочного
  const mid = rates.tripleMid ?? rates.triplePeak;
  if (mid == null) return null;
  return { rubPerKwh: mid, rateLabel: "полупик", meterType };
}

export function applianceHourlyCost(
  powerW: number | null | undefined,
  snapshot: PanelHouseSnapshot | null | undefined,
): ApplianceHourlyCost | null {
  if (powerW == null || !Number.isFinite(powerW) || powerW <= 0) return null;
  const rate = resolveActiveRubPerKwh(snapshot);
  if (!rate) return null;
  const rubPerHour = (powerW / 1000) * rate.rubPerKwh;
  if (!Number.isFinite(rubPerHour) || rubPerHour < 0) return null;
  return {
    rubPerHour,
    rubPerKwh: rate.rubPerKwh,
    rateLabel: rate.rateLabel,
    meterType: rate.meterType,
  };
}

export function formatRubPerHour(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 0.1) return `${value.toFixed(2).replace(".", ",")} ₽/ч`;
  if (value < 10) return `${value.toFixed(1).replace(".", ",")} ₽/ч`;
  return `${Math.round(value)} ₽/ч`;
}

export function formatApplianceCostHint(cost: ApplianceHourlyCost): string {
  return `${formatRubPerHour(cost.rubPerHour)} · ${formatRubPerKwh(cost.rubPerKwh)} (${cost.rateLabel})`;
}

export function houseTariffReady(
  snapshot: PanelHouseSnapshot | null | undefined,
): boolean {
  return Boolean(snapshot?.electricityTariff);
}

export function houseMeterTypeReady(
  snapshot: PanelHouseSnapshot | null | undefined,
): boolean {
  return Boolean(snapshot?.meterType);
}
