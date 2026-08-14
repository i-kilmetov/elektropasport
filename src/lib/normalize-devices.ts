import type { Device, DeviceStatus, DeviceType } from "@/types";

const DEVICE_TYPES: DeviceType[] = [
  "main_breaker",
  "rcd",
  "diff_breaker",
  "voltage_relay",
  "breaker",
  "spd",
  "afdd",
  "pe_bus",
  "n_bus",
];

const DEVICE_STATUSES: DeviceStatus[] = ["verified", "pending", "unknown"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeDevice(raw: unknown, index: number): Device | null {
  if (!isRecord(raw)) return null;

  const type = asString(raw.type) as DeviceType;
  if (!DEVICE_TYPES.includes(type)) return null;

  let status = asString(raw.status, "pending") as DeviceStatus;
  if (!DEVICE_STATUSES.includes(status)) status = "pending";

  const confidence = Math.min(
    100,
    Math.max(0, Math.round(asNumber(raw.confidence, 70))),
  );

  if (confidence < 75 && status === "verified") {
    status = "pending";
  }

  return {
    id: asNumber(raw.id, index + 1),
    type,
    name: asString(raw.name, `Устройство ${index + 1}`),
    rating: asString(raw.rating, "—"),
    status,
    manufacturer: asString(raw.manufacturer) || undefined,
    confidence,
    position: asNumber(raw.position, index),
    modules: Math.min(4, Math.max(1, Math.round(asNumber(raw.modules, 1)))),
    rail: Math.min(3, Math.max(0, Math.round(asNumber(raw.rail, 0)))),
    catalogId: asString(raw.catalogId) || undefined,
    poles: asString(raw.poles) || undefined,
    series: asString(raw.series) || undefined,
    model: asString(raw.model) || undefined,
    circuitLabel: asString(raw.circuitLabel) || undefined,
    brandKey: asString(raw.brandKey) || undefined,
    stickerIcon: asString(raw.stickerIcon) || undefined,
  };
}

export function normalizeAnalyzeResult(raw: unknown): {
  devices: Device[];
  safetyScore: number;
  linesCount: number;
  railCount: number;
} {
  const payload = isRecord(raw) ? raw : {};
  const list = Array.isArray(payload.devices) ? payload.devices : [];

  const devices = list
    .map((item, i) => normalizeDevice(item, i))
    .filter((d): d is Device => d !== null)
    .sort((a, b) => {
      const railDiff = (a.rail ?? 0) - (b.rail ?? 0);
      if (railDiff !== 0) return railDiff;
      return (a.position ?? 0) - (b.position ?? 0);
    })
    .map((d, i) => ({ ...d, id: i + 1, position: d.position ?? i }));

  const breakerLike = devices.filter(
    (d) =>
      d.type === "breaker" ||
      d.type === "diff_breaker" ||
      d.type === "main_breaker",
  ).length;

  const safetyScore = Math.min(
    100,
    Math.max(0, Math.round(asNumber(payload.safetyScore, 70))),
  );

  const linesCount = Math.max(
    0,
    Math.round(asNumber(payload.linesCount, breakerLike)),
  );

  const maxRail =
    devices.reduce((max, device) => Math.max(max, device.rail ?? 0), 0) + 1;
  const railCount = Math.min(
    4,
    Math.max(1, Math.round(asNumber(payload.railCount, maxRail))),
  );

  return { devices, safetyScore, linesCount, railCount };
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Модель вернула некорректный JSON");
  }
}
