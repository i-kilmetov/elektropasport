import type { Device, PanelWire } from "@/types";
import {
  analyzePanelSafety,
  type PanelSafetyAnalysis,
  type SafetyAdviceItem,
} from "@/lib/safety-score";

/** Typical continuous current for Cu PVC/LS cable sections (A). */
export function maxAmpsForCableSection(mm2: number): number {
  if (mm2 >= 16) return 80;
  if (mm2 >= 10) return 63;
  if (mm2 >= 6) return 40;
  if (mm2 >= 4) return 32;
  if (mm2 >= 2.5) return 25;
  if (mm2 >= 1.5) return 16;
  if (mm2 >= 1) return 10;
  return 6;
}

function parseAmps(rating: string | undefined): number | null {
  if (!rating) return null;
  const match = rating.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function deviceById(devices: Device[], id: number): Device | undefined {
  return devices.find((device) => device.id === id);
}

function isProtectiveDevice(device: Device): boolean {
  return (
    device.type === "breaker" ||
    device.type === "diff_breaker" ||
    device.type === "main_breaker" ||
    device.type === "rcd"
  );
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(5, Math.round(value)));
}

function isPeColor(color: string): boolean {
  return color.toUpperCase() === "#CA8A04";
}

function isNeutralColor(color: string): boolean {
  return color.toUpperCase() === "#2563EB";
}

/**
 * Stage 3 score: wiring correctness vs device ratings and cable sections.
 * Starts from the loads-stage baseline when available, then applies wiring deltas.
 */
export function analyzeProfessionalWiringSafety(input: {
  devices: Device[];
  wires: PanelWire[];
  phases?: "1" | "3";
  powerKw?: number;
  hasGround?: boolean;
  loadsScore?: number | null;
}): PanelSafetyAnalysis {
  const allDevices = input.devices;
  const rail = allDevices.filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );
  const base = analyzePanelSafety(
    rail,
    input.phases,
    input.powerKw,
    input.hasGround,
  );
  const advice: SafetyAdviceItem[] = [];
  const wires = input.wires ?? [];

  let score =
    typeof input.loadsScore === "number" ? input.loadsScore : base.score;
  let person = base.axes.person;
  let fire = base.axes.fire;
  let equipment = base.axes.equipment;

  if (wires.length === 0) {
    advice.push({
      id: "no_wires",
      axis: "general",
      kind: "improve",
      title: "Расключение не отмечено",
      detail:
        "Мастер ещё не указал соединения между клеммами — финальная оценка по кабелям недоступна.",
    });
    return {
      score: clampScore(score * 0.55),
      axes: {
        person: clampScore(person * 0.7),
        fire: clampScore(fire * 0.55),
        equipment: clampScore(equipment * 0.7),
      },
      advice,
    };
  }

  advice.push({
    id: "wires_present",
    axis: "general",
    kind: "good",
    title: "Расключение зафиксировано",
    detail: `На схеме отмечено соединений: ${wires.length}.`,
  });

  const protective = rail.filter(isProtectiveDevice);
  const wiredProtectiveIds = new Set<number>();
  for (const wire of wires) {
    wiredProtectiveIds.add(wire.from.deviceId);
    wiredProtectiveIds.add(wire.to.deviceId);
  }
  const protectiveWithWire = protective.filter((device) =>
    wiredProtectiveIds.has(device.id),
  );
  const coverage =
    protective.length > 0
      ? protectiveWithWire.length / protective.length
      : wires.length > 0
        ? 1
        : 0;

  if (coverage >= 0.75) {
    score += 8;
    fire += 6;
    advice.push({
      id: "wire_coverage",
      axis: "fire",
      kind: "good",
      title: "Большинство приборов расключено на схеме",
      detail:
        "Соединения покрывают основные защитные аппараты — так проще проверить корректность схемы.",
    });
  } else if (coverage >= 0.4) {
    advice.push({
      id: "wire_coverage",
      axis: "fire",
      kind: "improve",
      title: "Расключение указано частично",
      detail:
        "Часть автоматов и УЗО ещё без кабелей на схеме. Полная картина нужна для точной оценки.",
    });
  } else {
    score -= 10;
    fire -= 8;
    advice.push({
      id: "wire_coverage",
      axis: "fire",
      kind: "improve",
      title: "Мало соединений на схеме",
      detail:
        "Отмечено слишком мало кабелей относительно числа защитных приборов.",
    });
  }

  let undersized = 0;
  let matched = 0;
  let missingType = 0;
  let colorIssues = 0;

  for (const wire of wires) {
    if (!wire.cableType?.trim()) missingType += 1;

    const endpoints = [wire.from, wire.to]
      .map((terminal) => deviceById(allDevices, terminal.deviceId))
      .filter((device): device is Device => Boolean(device));

    const protectiveEnds = endpoints.filter(isProtectiveDevice);
    for (const device of protectiveEnds) {
      const amps = parseAmps(device.rating);
      if (!amps) continue;
      const allowed = maxAmpsForCableSection(wire.thicknessMm);
      if (amps > allowed + 0.5) {
        undersized += 1;
      } else {
        matched += 1;
      }
    }

    const touchesPeBus = endpoints.some((device) => device.type === "pe_bus");
    const touchesNBus = endpoints.some((device) => device.type === "n_bus");
    if (touchesPeBus && !isPeColor(wire.color)) {
      colorIssues += 1;
    }
    if (touchesNBus && !isNeutralColor(wire.color) && !isPeColor(wire.color)) {
      colorIssues += 1;
    }
  }

  if (undersized > 0) {
    const penalty = Math.min(28, 8 + undersized * 5);
    score -= penalty;
    fire -= Math.min(24, 6 + undersized * 4);
    advice.push({
      id: "cable_undersized",
      axis: "fire",
      kind: "improve",
      title:
        undersized === 1
          ? "Сечение кабеля слабее номинала прибора"
          : `${undersized} кабелей слабее номинала приборов`,
      detail:
        "Сечение жилы должно выдерживать ток автомата/дифавтомата. Слишком тонкий кабель греется и повышает риск пожара.",
    });
  } else if (matched > 0) {
    score += 10;
    fire += 8;
    advice.push({
      id: "cable_matched",
      axis: "fire",
      kind: "good",
      title: "Сечения согласованы с номиналами",
      detail:
        "Указанные кабели по сечению соответствуют токам защитных аппаратов на их концах.",
    });
  }

  if (missingType > 0) {
    score -= Math.min(8, missingType * 2);
    advice.push({
      id: "cable_type",
      axis: "general",
      kind: "improve",
      title: "Не у всех кабелей указан тип",
      detail:
        "Тип кабеля (например ВВГнг-LS) важен для оценки нагрева и условий прокладки.",
    });
  } else if (wires.length > 0) {
    score += 4;
    advice.push({
      id: "cable_type",
      axis: "general",
      kind: "good",
      title: "Тип кабелей указан",
      detail: "Для соединений на схеме задан тип кабеля.",
    });
  }

  if (colorIssues > 0) {
    score -= Math.min(12, colorIssues * 3);
    person -= Math.min(10, colorIssues * 2);
    advice.push({
      id: "wire_colors",
      axis: "person",
      kind: "improve",
      title: "Цвета жил не соответствуют роли",
      detail:
        "К шине PE обычно жёлто-зелёный, к N — синий. Неверная маркировка повышает риск ошибок при обслуживании.",
    });
  } else if (wires.some((wire) => isPeColor(wire.color) || isNeutralColor(wire.color))) {
    person += 4;
    advice.push({
      id: "wire_colors",
      axis: "person",
      kind: "good",
      title: "Цветовая маркировка соблюдена",
      detail: "PE и N на схеме отмечены привычными цветами.",
    });
  }

  return {
    score: clampScore(score),
    axes: {
      person: clampScore(person),
      fire: clampScore(fire),
      equipment: clampScore(equipment),
    },
    advice,
  };
}
