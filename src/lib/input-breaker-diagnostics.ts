import type { Device } from "@/types";
import { filled, parseRatingParts } from "@/lib/device-characteristics";

function breakerAmp(device: Device): number {
  const fromChars = device.characteristics?.["Номинальный ток"];
  const parsed = parseRatingParts(fromChars || device.rating);
  const raw = parsed.amps?.replace(/[^\d.]/g, "") ?? "";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Breakers that could be the panel incomer (not yet confirmed). */
export function inputBreakerCandidatePool(devices: Device[]): Device[] {
  return devices.filter(
    (device) =>
      device.type === "breaker" ||
      device.type === "diff_breaker" ||
      device.type === "main_breaker",
  );
}

export function panelHasConfirmedInputBreaker(devices: Device[]): boolean {
  return devices.some((device) => device.type === "main_breaker");
}

/**
 * Soft ranking for the verification test — leftmost on the top rail and
 * higher amperage score higher, but never auto-confirmed.
 */
export function rankInputBreakerCandidates(devices: Device[]): Device[] {
  const pool = inputBreakerCandidatePool(devices);
  return [...pool].sort((a, b) => {
    if (a.type === "main_breaker" && b.type !== "main_breaker") return -1;
    if (b.type === "main_breaker" && a.type !== "main_breaker") return 1;
    const rail = (a.rail ?? 0) - (b.rail ?? 0);
    if (rail !== 0) return rail;
    const pos = (a.position ?? 0) - (b.position ?? 0);
    if (pos !== 0) return pos;
    return breakerAmp(b) - breakerAmp(a);
  });
}

export function describeCandidate(device: Device): string {
  const typeLabel =
    device.type === "diff_breaker"
      ? "дифавтомат"
      : device.type === "main_breaker"
        ? "вводной автомат"
        : "автомат";
  const amp = filled(device.characteristics?.["Номинальный ток"])
    ? device.characteristics!["Номинальный ток"]
    : filled(device.rating)
      ? device.rating
      : null;
  const poles = filled(device.poles)
    ? device.poles
    : filled(device.characteristics?.["Полюса"])
      ? device.characteristics!["Полюса"]
      : null;
  const bits = [
    typeLabel,
    amp,
    poles,
    `рейка ${(device.rail ?? 0) + 1}`,
    `место ${(device.position ?? 0) + 1}`,
  ].filter(Boolean);
  return bits.join(" · ");
}
