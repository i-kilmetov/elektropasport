import {
  CATALOG_KIND_OPTIONS,
  catalogKindTitle,
  OTHER_CATALOG_KIND_OPTIONS,
  PRIMARY_CATALOG_KIND_OPTIONS,
} from "@/lib/appliance-catalog";
import type { HomeAppliance, HomeApplianceKind } from "@/types";

export const PRIMARY_LINE_EQUIPMENT_TITLES = PRIMARY_CATALOG_KIND_OPTIONS.map(
  (item) => item.title,
);

export const OTHER_LINE_EQUIPMENT_TITLES = OTHER_CATALOG_KIND_OPTIONS.map(
  (item) => item.title,
);

export function equipmentLabelForAppliance(appliance: HomeAppliance): string {
  if (appliance.kind === "other" && appliance.title.trim()) {
    return appliance.title.trim();
  }
  return catalogKindTitle(appliance.kind);
}

export function appliancesToEquipmentLabels(
  appliances: HomeAppliance[],
): string[] {
  return Array.from(new Set(appliances.map(equipmentLabelForAppliance)));
}

export function equipmentLabelToKind(label: string): HomeApplianceKind | null {
  const found = CATALOG_KIND_OPTIONS.find((item) => item.title === label);
  return found?.id ?? null;
}

export function mergeEquipmentSelections(
  known: string[],
  appliances: HomeAppliance[],
): string[] {
  return Array.from(
    new Set([...known, ...appliancesToEquipmentLabels(appliances)]),
  );
}

export function applianceNeedsDetails(appliance: HomeAppliance): boolean {
  if (appliance.catalogId) return false;
  if (appliance.brand?.trim()) return false;
  return true;
}

export function mergeAppliancesWithEquipmentLabels(
  appliances: HomeAppliance[],
  equipmentLabels: string[],
): HomeAppliance[] {
  const next = [...appliances];
  const hasKind = (kind: HomeApplianceKind) =>
    next.some((item) => item.kind === kind);
  const hasOtherTitle = (title: string) =>
    next.some(
      (item) =>
        item.kind === "other" &&
        item.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );

  for (const label of equipmentLabels) {
    const trimmed = label.trim();
    if (!trimmed) continue;

    const kind = equipmentLabelToKind(trimmed);
    if (kind) {
      if (hasKind(kind)) continue;
      next.push({
        id: crypto.randomUUID(),
        kind,
        title: catalogKindTitle(kind),
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    if (hasOtherTitle(trimmed)) continue;
    next.push({
      id: crypto.randomUUID(),
      kind: "other",
      title: trimmed,
      createdAt: new Date().toISOString(),
    });
  }

  return next;
}
