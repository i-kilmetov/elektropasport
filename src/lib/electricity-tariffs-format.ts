/** Client-safe helpers (no node:fs). */

export type TariffMeterType = "single" | "dual" | "triple" | "custom";

export function formatRubPerKwh(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")} ₽/кВт·ч`;
}
