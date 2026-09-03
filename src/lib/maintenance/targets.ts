import type { Device, HomeAppliance, HomeListItem, PanelObject } from "@/types";
import {
  applianceServicePreset,
  isRcdTestDeviceType,
  isServiceableApplianceKind,
  rcdDeviceTargetKey,
  applianceTargetKey,
  RCD_TEST_INTERVAL_DAYS,
} from "@/lib/maintenance/catalog";

export type MaintenanceRcdTarget = {
  kind: "rcd_test";
  targetKey: string;
  panelId: string;
  panelTitle: string;
  deviceId: number;
  deviceType: Device["type"];
  deviceName: string;
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

export function collectRcdTestTargets(
  items: HomeListItem[],
): MaintenanceRcdTarget[] {
  const out: MaintenanceRcdTarget[] = [];
  for (const panel of panelsFromHomeItems(items)) {
    for (const device of panel.devices ?? []) {
      if (!isRcdTestDeviceType(device.type)) continue;
      out.push({
        kind: "rcd_test",
        targetKey: rcdDeviceTargetKey(panel.id, device.id),
        panelId: panel.id,
        panelTitle: panel.title,
        deviceId: device.id,
        deviceType: device.type,
        deviceName: device.name || (device.type === "rcd" ? "УЗО" : "Дифавтомат"),
        intervalDays: RCD_TEST_INTERVAL_DAYS,
      });
    }
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
