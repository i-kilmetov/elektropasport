import type { Device, PanelWire } from "@/types";
import {
  deviceNeedsLineIdentification,
  parseLineLoads,
} from "@/lib/panel-identify";

/** Role labels that used to be auto-written under RCD / SPD / relay. */
const AUTO_ROLE_LABEL_RE =
  /^(УЗО(?:\s+\d+)?|УЗИП(?:\s+\d+)?|Реле напряжения(?:\s+\d+)?|Ввод)$/i;

export function isAutoRoleCircuitLabel(
  type: string,
  label: string | undefined | null,
): boolean {
  const raw = label?.trim();
  if (!raw) return false;
  if (type === "rcd" || type === "spd" || type === "voltage_relay") {
    return AUTO_ROLE_LABEL_RE.test(raw);
  }
  return false;
}

function sortPanelOrder(
  a: Pick<Device, "rail" | "position" | "id">,
  b: Pick<Device, "rail" | "position" | "id">,
): number {
  const rail = (a.rail ?? 0) - (b.rail ?? 0);
  if (rail !== 0) return rail;
  const pos = (a.position ?? 0) - (b.position ?? 0);
  if (pos !== 0) return pos;
  return Number(a.id) - Number(b.id);
}

function isLineDevice(type: string): boolean {
  return deviceNeedsLineIdentification(type);
}

function isZoneBoundary(type: string): boolean {
  return type === "rcd" || type === "main_breaker";
}

/**
 * Infer which line devices (автоматы / дифы / УЗДП) sit behind this RCD.
 * Prefer wiring graph when available; otherwise use rail position
 * (devices after this RCD until the next RCD / ввод).
 */
export function inferDevicesProtectedByRcd(
  rcd: Pick<Device, "id" | "type" | "rail" | "position">,
  panelDevices: Device[],
  wires?: PanelWire[] | null,
): Device[] {
  if (rcd.type !== "rcd") return [];

  const railDevices = panelDevices
    .filter((d) => d.type !== "pe_bus" && d.type !== "n_bus")
    .sort(sortPanelOrder);

  const byWiring = inferFromWires(rcd.id, railDevices, wires);
  if (byWiring.length > 0) return byWiring;

  return inferFromLayout(rcd, railDevices);
}

function inferFromWires(
  rcdId: number,
  panelDevices: Device[],
  wires?: PanelWire[] | null,
): Device[] {
  if (!wires?.length) return [];

  const adj = new Map<number, Set<number>>();
  const link = (a: number, b: number) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };

  for (const wire of wires) {
    link(wire.from.deviceId, wire.to.deviceId);
  }

  const deviceById = new Map(panelDevices.map((d) => [d.id, d]));
  const visited = new Set<number>([rcdId]);
  const queue = [rcdId];
  const protectedIds: number[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adj.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      const device = deviceById.get(next);
      if (!device) continue;
      if (isZoneBoundary(device.type) && device.id !== rcdId) continue;
      if (isLineDevice(device.type)) {
        protectedIds.push(device.id);
      }
      queue.push(next);
    }
  }

  return protectedIds
    .map((id) => deviceById.get(id))
    .filter((d): d is Device => Boolean(d))
    .sort(sortPanelOrder);
}

function inferFromLayout(
  rcd: Pick<Device, "id" | "rail" | "position">,
  railDevices: Device[],
): Device[] {
  const index = railDevices.findIndex((d) => d.id === rcd.id);
  if (index < 0) return [];

  const protectedDevices: Device[] = [];
  for (let i = index + 1; i < railDevices.length; i++) {
    const device = railDevices[i];
    if (isZoneBoundary(device.type)) break;
    if (isLineDevice(device.type)) {
      protectedDevices.push(device);
    }
  }

  // If nothing on the same rail after the RCD, take line devices on lower rails
  // until the next RCD (common: RCD alone, groups below).
  if (protectedDevices.length === 0) {
    const rcdRail = rcd.rail ?? 0;
    for (const device of railDevices) {
      if ((device.rail ?? 0) <= rcdRail) continue;
      if (device.type === "rcd") break;
      if (isLineDevice(device.type)) protectedDevices.push(device);
    }
  }

  return protectedDevices;
}

function shortLineCaption(device: Device): string {
  const label = device.circuitLabel?.trim();
  if (label && !isAutoRoleCircuitLabel(device.type, label)) {
    const loads = parseLineLoads(label);
    const rooms = Object.keys(loads);
    if (rooms.length === 1 && loads[rooms[0]]?.length) {
      const room = rooms[0];
      const items = loads[room];
      if (items.length <= 2) return `${room}: ${items.join(", ")}`;
      return `${room} (${items.length})`;
    }
    if (rooms.length > 1) {
      return rooms.slice(0, 2).join(", ") + (rooms.length > 2 ? "…" : "");
    }
    // Plain caption without room:load syntax
    return label.length > 28 ? `${label.slice(0, 26)}…` : label;
  }
  return device.rating?.trim() || "автомат";
}

/**
 * Caption under an RCD / on sticker: which groups it feeds.
 * Returns null when scope is unknown (no downstream line devices).
 */
export function formatRcdProtectionCaption(
  protectedDevices: Device[],
): string | null {
  if (protectedDevices.length === 0) return null;

  const parts = protectedDevices.map(shortLineCaption);
  const unique = Array.from(new Set(parts));

  if (unique.length === 1) {
    return `→ ${unique[0]}`;
  }
  if (unique.length <= 3) {
    return `→ ${unique.join(" · ")}`;
  }
  return `→ ${unique.slice(0, 2).join(" · ")} и ещё ${unique.length - 2}`;
}

export function rcdSchemeCaption(
  device: Device,
  panelDevices: Device[],
  wires?: PanelWire[] | null,
): string | null {
  if (device.type !== "rcd") return null;
  const stored = device.circuitLabel?.trim();
  if (stored && !isAutoRoleCircuitLabel("rcd", stored)) {
    // User-written protective note — keep it
    return stored;
  }
  const protectedDevices = inferDevicesProtectedByRcd(
    device,
    panelDevices,
    wires,
  );
  return formatRcdProtectionCaption(protectedDevices);
}
