import type { ApplianceManual, ApplianceSpec } from "@/types";

export type LoadedProductDetails = {
  powerW: number | null;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  title: string | null;
  matched: boolean;
  status?: string;
  statusDetail?: string | null;
};

export function buildApplianceSpecsSnapshot(
  details: Pick<LoadedProductDetails, "powerW" | "specs">,
): ApplianceSpec[] {
  const powerW = details.powerW ?? undefined;
  const powerSpec: ApplianceSpec | null =
    powerW != null
      ? {
          label: "Максимальная мощность",
          value: `${Math.round(powerW)} Вт`,
        }
      : null;
  return [
    ...(powerSpec ? [powerSpec] : []),
    ...(details.specs ?? []).filter(
      (spec) => !/мощност|power|watt/i.test(spec.label),
    ),
  ];
}

export function buildApplianceManualsSnapshot(
  details: Pick<LoadedProductDetails, "manuals">,
  fallbackSearch: string,
): ApplianceManual[] {
  const manuals: ApplianceManual[] = [...(details.manuals ?? [])];
  if (manuals.length === 0) {
    manuals.push({
      title: "Карточка товара",
      url: `https://icecat.biz/search?query=${encodeURIComponent(fallbackSearch)}`,
    });
  }
  return manuals;
}

export function icecatStatusMessage(
  status?: string,
  detail?: string | null,
): string | null {
  if (!status || status === "ok") return null;
  if (status === "not_configured") {
    return "Каталог характеристик не настроен на сервере (ICECAT_USERNAME).";
  }
  if (status === "full_only") {
    return (
      detail ||
      "Подробные характеристики этой модели доступны только в платном Full Icecat."
    );
  }
  if (status === "not_found") {
    return "Характеристики для этой модели не найдены в открытом каталоге Icecat.";
  }
  if (status === "auth_error") {
    return detail || "Ошибка доступа к Icecat — проверьте ICECAT_USERNAME на сервере.";
  }
  return detail || null;
}

export function extractPowerWattsFromSpecs(
  specs: ApplianceSpec[],
): number | undefined {
  for (const spec of specs) {
    const label = spec.label.toLowerCase();
    if (!/power|watt|мощност|потребл/.test(label)) continue;
    if (/standby|sleep|энергопотреб|energy consumption|kwh/i.test(label)) {
      continue;
    }
    const m = spec.value.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(k?\s*w)/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const unit = m[2]!.toLowerCase().replace(/\s/g, "");
    const watts = unit.startsWith("kw") ? Math.round(n * 1000) : Math.round(n);
    if (watts >= 20 && watts <= 20000) return watts;
  }
  return undefined;
}
