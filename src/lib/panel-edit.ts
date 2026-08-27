import type { Device } from "@/types";
import {
  deriveRailCount,
  deviceModules,
  groupDevicesByRail,
  MAX_MODULES_PER_RAIL,
  MAX_RAILS,
  railModuleTotal,
} from "@/lib/panel-rails";

export type DropSlot = {
  rail: number;
  index: number;
  isNewRail: boolean;
};

export function nextDeviceId(devices: Device[]): number {
  return devices.reduce((max, device) => Math.max(max, device.id), 0) + 1;
}

export function flattenRails(rails: Device[][]): Device[] {
  return rails.flatMap((rail, railIdx) =>
    rail.map((device, position) => ({
      ...device,
      rail: railIdx,
      position,
    })),
  );
}

/** Drop empty rows so the board stays compact after delete/move. */
export function compactDevices(
  devices: Device[],
  railCount?: number,
): Device[] {
  const rails = groupDevicesByRail(devices, railCount).filter(
    (rail) => rail.length > 0,
  );
  if (rails.length === 0) rails.push([]);
  return flattenRails(rails);
}

export function removeDevice(devices: Device[], id: number): Device[] {
  return compactDevices(devices.filter((device) => device.id !== id));
}

export function insertIndexAtX(
  rail: Device[],
  x: number,
  modulePx: number,
  gapPx: number,
  draggingId?: number | null,
): number {
  const items =
    draggingId != null
      ? rail.filter((device) => device.id !== draggingId)
      : rail;
  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    const width = deviceModules(items[i]!) * modulePx;
    if (x < cursor + width / 2) return i;
    cursor += width + gapPx;
  }
  return items.length;
}

export function sameDropSlot(
  a: DropSlot | null,
  b: DropSlot | null,
): boolean {
  if (a == null || b == null) return a === b;
  return (
    a.rail === b.rail && a.index === b.index && a.isNewRail === b.isNewRail
  );
}

export function canFitOnRail(rail: Device[], device: Device): boolean {
  return railModuleTotal(rail) + deviceModules(device) <= MAX_MODULES_PER_RAIL;
}

export function insertDevice(
  devices: Device[],
  moving: Device,
  slot: DropSlot,
): Device[] | null {
  const others = devices.filter((device) => device.id !== moving.id);
  const neededRails = Math.min(
    MAX_RAILS,
    Math.max(deriveRailCount(others), slot.rail + 1),
  );
  const rails = groupDevicesByRail(others, neededRails);
  while (rails.length <= slot.rail && rails.length < MAX_RAILS) {
    rails.push([]);
  }
  const targetIdx = Math.min(slot.rail, rails.length - 1);
  const target = rails[targetIdx]!;
  if (!canFitOnRail(target, moving)) {
    if (rails.length >= MAX_RAILS) return null;
    rails.push([{ ...moving }]);
    return compactDevices(flattenRails(rails));
  }
  const index = Math.max(0, Math.min(slot.index, target.length));
  target.splice(index, 0, { ...moving });
  return compactDevices(flattenRails(rails));
}

export function appendDevice(
  devices: Device[],
  device: Device,
): Device[] | null {
  const rails = groupDevicesByRail(devices);
  let railIdx = Math.max(0, rails.length - 1);
  if (!canFitOnRail(rails[railIdx] ?? [], device)) {
    if (rails.length >= MAX_RAILS) return null;
    rails.push([]);
    railIdx = rails.length - 1;
  }
  rails[railIdx]!.push({ ...device });
  return flattenRails(rails);
}

export function previewRails(
  devices: Device[],
  draggingId: number | null,
  slot: DropSlot | null,
  railCount?: number,
): { rails: Device[][]; placeholder: DropSlot | null } {
  if (draggingId == null) {
    return {
      rails: groupDevicesByRail(devices, railCount),
      placeholder: null,
    };
  }
  const others = devices.filter((device) => device.id !== draggingId);
  return {
    rails: groupDevicesByRail(others, railCount),
    placeholder: slot,
  };
}
