import type { Device } from "@/types";

/** Standard DIN rail width in modules (typical residential panel). */
export const MAX_MODULES_PER_RAIL = 18;

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

export function groupDevicesByRail(
  devices: Device[] | undefined,
  railCount?: number,
): Device[][] {
  const list = (devices ?? []).filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );
  const maxRail =
    list.reduce((max, device) => Math.max(max, device.rail ?? 0), 0) + 1;
  const numRails = Math.max(1, Math.min(4, railCount ?? maxRail));
  const rails: Device[][] = Array.from({ length: numRails }, () => []);
  for (const device of list) {
    const rail = Math.min(Math.max(device.rail ?? 0, 0), numRails - 1);
    rails[rail].push(device);
  }
  return rails;
}
