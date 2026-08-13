import type { Device } from "@/types";

function parseAmps(rating: string): number | null {
  const match = rating.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function looksThreePhase(poles?: string): boolean {
  if (!poles) return false;
  const normalized = poles.toUpperCase().replace(/\s+/g, "");
  return (
    normalized.includes("3P") ||
    normalized.includes("4P") ||
    normalized.includes("3P+N") ||
    normalized === "3" ||
    normalized === "4"
  );
}

function looksSinglePhase(poles?: string): boolean {
  if (!poles) return false;
  const normalized = poles.toUpperCase().replace(/\s+/g, "");
  return (
    normalized.includes("1P") ||
    normalized === "1" ||
    normalized === "1P+N" ||
    normalized === "2P"
  );
}

/**
 * Heuristic safety score from device composition + declared network params.
 * Does NOT assess wiring correctness.
 */
export function computePanelSafetyScore(
  devices: Device[],
  phases: "1" | "3",
  powerKw: number,
): number {
  const rail = devices.filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );

  let score = 28;

  const has = (type: Device["type"]) =>
    rail.some((device) => device.type === type);
  const count = (type: Device["type"]) =>
    rail.filter((device) => device.type === type).length;

  if (has("main_breaker")) score += 16;
  else score -= 14;

  if (has("rcd") || has("diff_breaker")) score += 22;
  else score -= 18;

  if (has("voltage_relay")) score += 12;
  if (has("spd")) score += 8;
  if (has("afdd")) score += 5;

  const lineProtection = count("breaker") + count("diff_breaker");
  if (lineProtection >= 3) score += 10;
  else if (lineProtection >= 1) score += 5;
  else score -= 6;

  const main = rail.find((device) => device.type === "main_breaker");
  if (main) {
    if (phases === "3" && looksThreePhase(main.poles)) score += 6;
    if (phases === "1" && looksThreePhase(main.poles)) score -= 6;
    if (phases === "3" && looksSinglePhase(main.poles)) score -= 12;

    const amps = parseAmps(main.rating);
    if (amps) {
      const capacityKw =
        phases === "3"
          ? (amps * 400 * Math.sqrt(3)) / 1000 * 0.9
          : (amps * 230) / 1000 * 0.9;
      if (powerKw <= capacityKw) score += 10;
      else if (powerKw <= capacityKw * 1.2) score -= 4;
      else score -= 16;
    }
  }

  if (powerKw > 0 && powerKw < 3 && !has("rcd") && !has("diff_breaker")) {
    score -= 4;
  }
  if (powerKw >= 10 && !has("voltage_relay")) score -= 4;
  if (powerKw >= 15 && phases === "1") score -= 6;

  const verified = rail.filter((device) => device.status === "verified").length;
  if (rail.length > 0) {
    score += Math.round((verified / rail.length) * 8);
  }

  return Math.min(100, Math.max(5, Math.round(score)));
}

export function safetyLabel(score: number): string {
  if (score >= 80) return "хороший";
  if (score >= 60) return "средний";
  return "низкий";
}

export const safetyScoreDisclaimer =
  "Уровень безопасности оценивается только по составу приборов и указанным параметрам сети (фазы и мощность). Сервис не проверяет, правильно ли щиток расключен и исправны ли соединения.";

export function isPanelSafetyKnown(panel: {
  phases?: "1" | "3";
  powerKw?: string;
  safety?: number | null;
}): boolean {
  if (!panel.phases || !panel.powerKw?.trim()) return false;
  return typeof panel.safety === "number" && panel.safety >= 0;
}
