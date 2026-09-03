import type { Device, DeviceStatus, DeviceType } from "@/types";
import {
  DEVICE_DETAILS_CONFIDENCE,
  resolveBrandKey,
} from "@/lib/manufacturer-brands";
import { prepareAnalyzedDevices } from "@/lib/device-characteristics";

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

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Accepts common VL box formats and returns normalized {x,y,w,h} in 0–1.
 * Supports: bbox object, [x,y,w,h] in 0–1, box_2d [x1,y1,x2,y2] in 0–100/1000.
 */
export function normalizeDeviceBbox(raw: unknown): Device["bbox"] | undefined {
  if (Array.isArray(raw) && raw.length >= 4) {
    const vals = raw.slice(0, 4).map(Number);
    if (!vals.every(Number.isFinite)) return undefined;
    const [a, b, c, d] = vals as [number, number, number, number];
    const max = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));

    // Pixel / percent corners (Qwen box_2d style)
    if (max > 1.5) {
      const scale = max > 100 ? 1000 : 100;
      const x1 = Math.min(a, c) / scale;
      const y1 = Math.min(b, d) / scale;
      const w = Math.abs(c - a) / scale;
      const h = Math.abs(d - b) / scale;
      if (w < 0.01 || h < 0.01) return undefined;
      return { x: clamp01(x1), y: clamp01(y1), w: clamp01(w), h: clamp01(h) };
    }

    // Prompt asks for normalized xywh
    if (c < 0.01 || d < 0.01) return undefined;
    return {
      x: clamp01(a),
      y: clamp01(b),
      w: clamp01(c),
      h: clamp01(d),
    };
  }

  if (!isRecord(raw)) return undefined;
  const x = asNumber(raw.x ?? raw.left, NaN);
  const y = asNumber(raw.y ?? raw.top, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;

  if ("w" in raw || "width" in raw) {
    const w = asNumber(raw.w ?? raw.width, NaN);
    const h = asNumber(raw.h ?? raw.height, NaN);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 0.01 || h < 0.01) {
      return undefined;
    }
    const scale = x > 1.5 || y > 1.5 || w > 1.5 || h > 1.5 ? 1000 : 1;
    return {
      x: clamp01(x / scale),
      y: clamp01(y / scale),
      w: clamp01(w / scale),
      h: clamp01(h / scale),
    };
  }

  const x2 = asNumber(raw.x2 ?? raw.right, NaN);
  const y2 = asNumber(raw.y2 ?? raw.bottom, NaN);
  if (!Number.isFinite(x2) || !Number.isFinite(y2)) return undefined;
  const scale = Math.max(x, y, x2, y2) > 1.5 ? 1000 : 1;
  const nx1 = Math.min(x, x2) / scale;
  const ny1 = Math.min(y, y2) / scale;
  const nw = (Math.max(x, x2) - Math.min(x, x2)) / scale;
  const nh = (Math.max(y, y2) - Math.min(y, y2)) / scale;
  if (nw < 0.01 || nh < 0.01) return undefined;
  return {
    x: clamp01(nx1),
    y: clamp01(ny1),
    w: clamp01(nw),
    h: clamp01(nh),
  };
}

/** Rough boxes from rail layout when the model omitted pixel coordinates. */
export function estimateDeviceBboxes(
  devices: Device[],
  railCount: number,
): Device[] {
  const rails = Math.max(1, railCount);
  const panel = { left: 0.07, right: 0.93, top: 0.1, bottom: 0.9 };
  const panelW = panel.right - panel.left;
  const panelH = panel.bottom - panel.top;
  const rowH = panelH / rails;

  const byRail = new Map<number, Device[]>();
  for (const device of devices) {
    const rail = device.rail ?? 0;
    const list = byRail.get(rail) ?? [];
    list.push(device);
    byRail.set(rail, list);
  }

  return devices.map((device) => {
    if (device.bbox) return device;
    const rail = Math.min(rails - 1, Math.max(0, device.rail ?? 0));
    const row = byRail.get(rail) ?? [device];
    const totalModules = Math.max(
      1,
      row.reduce((sum, d) => sum + (d.modules ?? 1), 0),
    );
    let moduleOffset = 0;
    for (const d of row) {
      if (d.id === device.id) break;
      moduleOffset += d.modules ?? 1;
    }
    const modules = device.modules ?? 1;
    const x = panel.left + (moduleOffset / totalModules) * panelW;
    const w = (modules / totalModules) * panelW;
    const y = panel.top + rail * rowH + rowH * 0.12;
    const h = rowH * 0.76;
    return {
      ...device,
      bbox: {
        x: clamp01(x),
        y: clamp01(y),
        w: clamp01(Math.max(0.04, w * 0.96)),
        h: clamp01(h),
      },
    };
  });
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

  if (confidence < DEVICE_DETAILS_CONFIDENCE) {
    status = status === "unknown" ? "unknown" : "pending";
  } else if (status === "pending" && confidence >= DEVICE_DETAILS_CONFIDENCE) {
    status = "verified";
  }

  const brandKey =
    asString(raw.brandKey) ||
    resolveBrandKey(undefined, asString(raw.manufacturer)) ||
    undefined;

  const manufacturer =
    confidence >= DEVICE_DETAILS_CONFIDENCE
      ? asString(raw.manufacturer) || undefined
      : undefined;

  const series =
    confidence >= DEVICE_DETAILS_CONFIDENCE
      ? asString(raw.series) || undefined
      : undefined;

  const bbox =
    normalizeDeviceBbox(raw.bbox) ??
    normalizeDeviceBbox(raw.box_2d) ??
    normalizeDeviceBbox(raw.box2d) ??
    normalizeDeviceBbox(raw.boundingBox);

  return {
    id: asNumber(raw.id, index + 1),
    type,
    name: asString(raw.name, `Устройство ${index + 1}`),
    rating: asString(raw.rating, "—"),
    status,
    manufacturer,
    confidence,
    position: asNumber(raw.position, index),
    modules: Math.min(4, Math.max(1, Math.round(asNumber(raw.modules, 1)))),
    rail: Math.min(3, Math.max(0, Math.round(asNumber(raw.rail, 0)))),
    catalogId: asString(raw.catalogId) || undefined,
    article: asString(raw.article) || undefined,
    imageUrl: asString(raw.imageUrl) || undefined,
    poles:
      confidence >= DEVICE_DETAILS_CONFIDENCE
        ? asString(raw.poles) || undefined
        : undefined,
    series,
    model:
      confidence >= DEVICE_DETAILS_CONFIDENCE
        ? asString(raw.model) || undefined
        : undefined,
    characteristics: isRecord(raw.characteristics)
      ? Object.fromEntries(
          Object.entries(raw.characteristics).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === "string" && entry[1].trim().length > 0,
          ),
        )
      : undefined,
    circuitLabel: asString(raw.circuitLabel) || undefined,
    brandKey:
      confidence >= DEVICE_DETAILS_CONFIDENCE ? brandKey : undefined,
    stickerIcon: asString(raw.stickerIcon) || undefined,
    bbox,
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

  let devices = prepareAnalyzedDevices(
    list
      .map((item, i) => normalizeDevice(item, i))
      .filter((d): d is Device => d !== null)
      .sort((a, b) => {
        const railDiff = (a.rail ?? 0) - (b.rail ?? 0);
        if (railDiff !== 0) return railDiff;
        return (a.position ?? 0) - (b.position ?? 0);
      })
      .map((d, i) => ({ ...d, id: i + 1, position: d.position ?? i })),
  );

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

  devices = estimateDeviceBboxes(devices, railCount);

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
