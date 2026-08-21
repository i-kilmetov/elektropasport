import type { Device, DeviceType } from "@/types";
import {
  deviceSpecGuide,
  type RailDeviceType,
} from "@/lib/device-spec-guide";

/** Shown in the device card when a field was not recognized from the photo. */
export const UNKNOWN_SPEC_VALUE = "—";

const BREAKER_LIKE: DeviceType[] = [
  "breaker",
  "main_breaker",
  "diff_breaker",
  "afdd",
];

/**
 * After photo analysis we never treat a breaker as the incomer —
 * that is confirmed only via diagnostics.
 */
export function demoteMainBreakerFromAnalysis(device: Device): Device {
  if (device.type !== "main_breaker") return device;
  const name = device.name.trim();
  const demotedName =
    /ввод/i.test(name) || name.toLowerCase() === "main breaker"
      ? "Автомат"
      : name || "Автомат";
  return {
    ...device,
    type: "breaker",
    name: demotedName,
  };
}

export function parseRatingParts(rating: string | undefined): {
  curve?: string;
  amps?: string;
} {
  const raw = rating?.trim() ?? "";
  if (!raw || raw === "—" || raw === "?") return {};
  const curveAmp = /^([A-Za-zА-Яа-я])\s*(\d+(?:[.,]\d+)?)\s*A?$/i.exec(raw);
  if (curveAmp) {
    return {
      curve: curveAmp[1]!.toUpperCase(),
      amps: `${curveAmp[2]!.replace(",", ".")} A`,
    };
  }
  const ampsOnly = /(\d+(?:[.,]\d+)?)\s*A\b/i.exec(raw);
  if (ampsOnly) {
    return { amps: `${ampsOnly[1]!.replace(",", ".")} A` };
  }
  return {};
}

/** Build editable characteristic map for a rail device from OCR fields. */
export function seedDeviceCharacteristics(device: Device): Device {
  if (device.type === "pe_bus" || device.type === "n_bus") return device;

  const guide = deviceSpecGuide[device.type as RailDeviceType];
  if (!guide) return device;

  const next: Record<string, string> = { ...(device.characteristics ?? {}) };
  const { curve, amps } = parseRatingParts(device.rating);

  if (device.poles?.trim() && !filled(next["Полюса"])) {
    next["Полюса"] = device.poles.trim();
  }
  if (amps && !filled(next["Номинальный ток"])) {
    next["Номинальный ток"] = amps;
  }
  if (
    curve &&
    BREAKER_LIKE.includes(device.type) &&
    !filled(next["Кривая отключения"])
  ) {
    next["Кривая отключения"] = curve;
  }
  if (device.manufacturer?.trim() && !filled(next["Производитель"])) {
    next["Производитель"] = device.manufacturer.trim();
  }

  return { ...device, characteristics: next };
}

export function filled(value: string | undefined | null): boolean {
  const v = value?.trim() ?? "";
  return Boolean(v) && v !== "—" && v !== "?";
}

export function displaySpecValue(value: string | undefined | null): string {
  const v = value?.trim() ?? "";
  if (!v) return UNKNOWN_SPEC_VALUE;
  return v;
}

/** Spec rows for the device card: guide fields + current values (or —). */
export function deviceCharacteristicRows(
  device: Device,
): Array<[string, string]> {
  const guide = deviceSpecGuide[device.type as RailDeviceType];
  if (!guide) {
    return Object.entries(device.characteristics ?? {}).map(([key, value]) => [
      key,
      displaySpecValue(value),
    ]);
  }
  return guide.fields.map((field) => [
    field.key,
    displaySpecValue(device.characteristics?.[field.key]),
  ]);
}

export function prepareAnalyzedDevices(devices: Device[]): Device[] {
  return devices
    .map(demoteMainBreakerFromAnalysis)
    .map(seedDeviceCharacteristics)
    .map((device) => {
      if (!filled(device.rating)) {
        return { ...device, rating: UNKNOWN_SPEC_VALUE };
      }
      return device;
    });
}
