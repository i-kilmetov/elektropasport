import type { Device } from "@/types";
import type { PanelObject } from "@/types";

/** Standard DIN rail width in modules (typical residential panel). */
export const MAX_MODULES_PER_RAIL = 18;
/** Typical residential board: 1–4 DIN rows. */
export const MAX_RAILS = 4;

/** Rail devices only — same basis as scheme / game (no PE/N bus bars). */
export function isRailDevice(device: Device): boolean {
  return device.type !== "pe_bus" && device.type !== "n_bus";
}

export function countPanelDevices(
  panel: Pick<PanelObject, "devices" | "breakers"> | null | undefined,
): number {
  if (Array.isArray(panel?.devices)) {
    return panel.devices.filter(isRailDevice).length;
  }
  return typeof panel?.breakers === "number" && panel.breakers > 0
    ? panel.breakers
    : 0;
}

export function deviceWordRu(count: number): string {
  const n10 = count % 10;
  const n100 = count % 100;
  if (n10 === 1 && n100 !== 11) return "прибор";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "прибора";
  return "приборов";
}

export function formatPanelDeviceCount(
  panel: Pick<PanelObject, "devices" | "breakers"> | null | undefined,
): string {
  const count = countPanelDevices(panel);
  return `${count} ${deviceWordRu(count)}`;
}

export function deviceModules(device: Device): number {
  if (device.modules && device.modules > 0) return device.modules;
  return 1;
}

export function railModuleTotal(devices: Device[]): number {
  return devices.reduce((sum, device) => sum + deviceModules(device), 0);
}

export function truncateDevicesForRail(
  devices: Device[],
  maxModules = MAX_MODULES_PER_RAIL,
): {
  visible: Device[];
  totalModules: number;
  hiddenModules: number;
  hasOverflow: boolean;
} {
  let used = 0;
  const visible: Device[] = [];
  for (const device of devices) {
    const modules = deviceModules(device);
    if (used + modules > maxModules) break;
    visible.push(device);
    used += modules;
  }
  const totalModules = railModuleTotal(devices);
  return {
    visible,
    totalModules,
    hiddenModules: Math.max(0, totalModules - used),
    hasOverflow: totalModules > maxModules,
  };
}

export function panelHasRailOverflow(
  devices: Device[] | undefined,
  railCount?: number,
): boolean {
  return groupDevicesByRail(devices, railCount).some(
    (rail) => truncateDevicesForRail(rail).hasOverflow,
  );
}

export function groupDevicesByRail(
  devices: Device[] | undefined,
  railCount?: number,
): Device[][] {
  const list = (devices ?? []).filter(isRailDevice);
  const maxRail =
    list.reduce((max, device) => Math.max(max, device.rail ?? 0), 0) + 1;
  const numRails = Math.max(
    1,
    Math.min(MAX_RAILS, Math.max(railCount ?? 0, maxRail)),
  );
  const rails: Device[][] = Array.from({ length: numRails }, () => []);
  for (const device of list) {
    const rail = Math.min(Math.max(device.rail ?? 0, 0), numRails - 1);
    rails[rail].push(device);
  }
  for (const rail of rails) {
    rail.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return rails;
}

/** Infer row count from device.rail when panel.railCount was not persisted. */
export function deriveRailCount(devices?: Device[] | null): number {
  const list = (devices ?? []).filter(isRailDevice);
  if (list.length === 0) return 1;
  const maxRail =
    list.reduce((max, device) => Math.max(max, device.rail ?? 0), 0) + 1;
  return Math.min(MAX_RAILS, Math.max(1, maxRail));
}
