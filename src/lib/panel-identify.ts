export type IdentifyObjectType = "apartment" | "house" | "other";

export type IdentifyContext = {
  objectType: IdentifyObjectType;
  rooms: string[];
  equipment: string[];
};

const STORAGE_PREFIX = "elektropasport:panel-identify";

function storageKey(panelId?: string | null) {
  return panelId ? `${STORAGE_PREFIX}:${panelId}` : STORAGE_PREFIX;
}

export function loadIdentifyContext(
  panelId?: string | null,
): IdentifyContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(panelId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IdentifyContext;
    if (
      parsed.objectType !== "apartment" &&
      parsed.objectType !== "house" &&
      parsed.objectType !== "other"
    ) {
      return null;
    }
    return {
      objectType: parsed.objectType,
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms.filter(Boolean) : [],
      equipment: Array.isArray(parsed.equipment)
        ? parsed.equipment.filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}

export function saveIdentifyContext(
  panelId: string | null | undefined,
  context: IdentifyContext,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(panelId), JSON.stringify(context));
}

function roomLoadSeparatorIndex(text: string): number {
  const separators = [":", "："];
  let best = -1;
  for (const separator of separators) {
    const idx = text.indexOf(separator);
    if (idx > 0 && (best < 0 || idx < best)) best = idx;
  }
  return best;
}

export function parseLineLoads(
  label: string | undefined | null,
): Record<string, string[]> {
  const raw = label?.trim() ?? "";
  if (!raw) return {};
  const result: Record<string, string[]> = {};
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const idx = roomLoadSeparatorIndex(trimmed);
    if (idx <= 0) continue;
    const room = trimmed.slice(0, idx).trim();
    const loads = trimmed
      .slice(idx + 1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (room && loads.length > 0) result[room] = loads;
  }
  return result;
}

export function inferObjectTypeFromLabel(
  label: string | undefined | null,
): IdentifyObjectType | null {
  const raw = label ?? "";
  if (raw.includes("Вся квартира")) return "apartment";
  if (raw.includes("Весь дом")) return "house";
  if (raw.includes("Весь объект")) return "other";
  return null;
}

/** Devices that feed a room/load line and need the guided walkthrough. */
export function deviceNeedsLineIdentification(type: string): boolean {
  return type === "breaker" || type === "diff_breaker" || type === "afdd";
}

export function deviceHasLineIdentification(circuitLabel?: string): boolean {
  return Boolean(circuitLabel?.trim());
}

const PROTECTIVE_LABEL_BASE: Record<string, string> = {
  main_breaker: "Ввод",
  // RCD captions come from protected groups (panel-protection), not «УЗО N».
  voltage_relay: "Реле напряжения",
  spd: "УЗИП",
};

export function protectiveLabelHint(type: string): string {
  switch (type) {
    case "main_breaker":
      return "Вводной автомат отключает весь щиток, а не одну комнату. На стикере пишем «Ввод».";
    case "rcd":
      return "УЗО защищает группу линий. Подпись на схеме и стикере строится по автоматам после него (какие линии через него идут). При желании можно задать свою подпись.";
    case "voltage_relay":
      return "Реле напряжения защищает щиток от скачков сети. На стикере — «Реле напряжения».";
    case "spd":
      return "УЗИП принимает на себя импульс перенапряжения. На стикере — «УЗИП».";
    default:
      return "Этот прибор не кормит отдельную комнату. На стикере будет его роль в щитке.";
  }
}

/** Auto caption for devices that do not feed a single room line. */
export function defaultDeviceCircuitLabel(
  device: { id: number; type: string; rail?: number; position?: number },
  panelDevices: Array<{
    id: number;
    type: string;
    rail?: number;
    position?: number;
  }>,
): string | null {
  if (device.type === "rcd") return null;
  const base = PROTECTIVE_LABEL_BASE[device.type];
  if (!base) return null;
  const sameType = panelDevices
    .filter((item) => item.type === device.type)
    .sort((a, b) => {
      const rail = (a.rail ?? 0) - (b.rail ?? 0);
      if (rail !== 0) return rail;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  if (sameType.length <= 1) return base;
  const index = sameType.findIndex(
    (item) => Number(item.id) === Number(device.id),
  );
  return `${base} ${Math.max(1, index + 1)}`;
}

export function occupiedLoadKey(room: string, load: string) {
  return `${room}::${load}`;
}

export function collectOccupiedLoads(
  devices: Array<{ id: number; name: string; circuitLabel?: string }>,
  excludeDeviceId: number,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const device of devices) {
    if (device.id === excludeDeviceId) continue;
    const loads = parseLineLoads(device.circuitLabel);
    for (const [room, items] of Object.entries(loads)) {
      for (const load of items) {
        map.set(occupiedLoadKey(room, load), device.name);
      }
    }
  }
  return map;
}

export function formatLineLoads(loadsByRoom: Record<string, string[]>): string {
  return Object.entries(loadsByRoom)
    .filter(([, loads]) => loads.length > 0)
    .map(([room, loads]) => `${room}: ${loads.join(", ")}`)
    .join("; ");
}

/** Line device has a user-chosen load/room label (any saved caption). */
export function deviceHasSpecifiedLineLoads(device: {
  type: string;
  circuitLabel?: string;
}): boolean {
  if (!deviceNeedsLineIdentification(device.type)) return false;
  return deviceHasLineIdentification(device.circuitLabel);
}

/**
 * True when every line device (автомат / диф / УЗДП) has a saved caption.
 * Protective devices do not block: they get role labels like «Ввод» / «УЗО».
 */
export function allPanelLoadsIdentified(
  devices: Array<{
    id: number;
    type: string;
    rail?: number;
    position?: number;
    circuitLabel?: string;
  }>,
): boolean {
  const rail = devices.filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );
  if (rail.length === 0) return false;
  const lineDevices = rail.filter((device) =>
    deviceNeedsLineIdentification(device.type),
  );
  if (lineDevices.length === 0) return true;
  return lineDevices.every((device) => deviceHasSpecifiedLineLoads(device));
}
