import type { HomeAppliance, HomeListItem, PanelObject } from "@/types";
import {
  applianceServicePreset,
  isRcdTestDeviceType,
  isServiceableApplianceKind,
  rcdPanelTargetKey,
  applianceTargetKey,
  RCD_TEST_INTERVAL_DAYS,
} from "@/lib/maintenance/catalog";

export type MaintenancePanelTarget = {
  kind: "rcd_test";
  targetKey: string;
  panelId: string;
  panelTitle: string;
  deviceCount: number;
  intervalDays: number;
};

export type MaintenanceApplianceTarget = {
  kind: "appliance_service";
  targetKey: string;
  panelId: string;
  panelTitle: string;
  applianceId: string;
  applianceKind: HomeAppliance["kind"];
  title: string;
  brand?: string;
  model?: string;
  hint: string;
  defaultIntervalDays: number;
};

export function panelsFromHomeItems(items: HomeListItem[]): PanelObject[] {
  return items.filter((item): item is PanelObject => item.kind === "panel");
}

export function hasRcdTestDevices(items: HomeListItem[]): boolean {
  return panelsFromHomeItems(items).some((panel) =>
    (panel.devices ?? []).some((device) => isRcdTestDeviceType(device.type)),
  );
}

/** One target per panel that has any УЗО / дифавтомат. */
export function collectRcdTestTargets(
  items: HomeListItem[],
): MaintenancePanelTarget[] {
  const out: MaintenancePanelTarget[] = [];
  for (const panel of panelsFromHomeItems(items)) {
    const deviceCount = (panel.devices ?? []).filter((device) =>
      isRcdTestDeviceType(device.type),
    ).length;
    if (deviceCount === 0) continue;
    out.push({
      kind: "rcd_test",
      targetKey: rcdPanelTargetKey(panel.id),
      panelId: panel.id,
      panelTitle: panel.title,
      deviceCount,
      intervalDays: RCD_TEST_INTERVAL_DAYS,
    });
  }
  return out;
}

export function collectApplianceServiceTargets(
  items: HomeListItem[],
): MaintenanceApplianceTarget[] {
  const out: MaintenanceApplianceTarget[] = [];
  for (const panel of panelsFromHomeItems(items)) {
    for (const appliance of panel.appliances ?? []) {
      if (!isServiceableApplianceKind(appliance.kind)) continue;
      const preset = applianceServicePreset(appliance.kind);
      if (!preset) continue;
      const labelParts = [
        appliance.brand?.trim(),
        appliance.model?.trim(),
      ].filter(Boolean);
      out.push({
        kind: "appliance_service",
        targetKey: applianceTargetKey(panel.id, appliance.id),
        panelId: panel.id,
        panelTitle: panel.title,
        applianceId: appliance.id,
        applianceKind: appliance.kind,
        title:
          labelParts.length > 0
            ? `${preset.title} · ${labelParts.join(" ")}`
            : preset.title,
        brand: appliance.brand,
        model: appliance.model,
        hint: preset.hint,
        defaultIntervalDays: preset.defaultIntervalDays,
      });
    }
  }
  return out;
}
