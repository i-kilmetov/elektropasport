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

export function parseLineLoads(
  label: string | undefined | null,
): Record<string, string[]> {
  const raw = label?.trim() ?? "";
  if (!raw || !raw.includes(":")) return {};
  const result: Record<string, string[]> = {};
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const idx = trimmed.indexOf(":");
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

export function formatLineLoads(loadsByRoom: Record<string, string[]>): string {
  return Object.entries(loadsByRoom)
    .filter(([, loads]) => loads.length > 0)
    .map(([room, loads]) => `${room}: ${loads.join(", ")}`)
    .join("; ");
}
