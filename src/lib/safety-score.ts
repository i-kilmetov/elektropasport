import type { Device } from "@/types";
import { assessDeviceLineLoadSafety } from "@/lib/line-load-safety";
import {
  allPanelLoadsIdentified,
  deviceNeedsLineIdentification,
} from "@/lib/panel-identify";

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

export type SafetyAxisId = "person" | "fire" | "equipment";

export type SafetyAdviceItem = {
  id: string;
  title: string;
  detail: string;
  kind: "good" | "improve";
  axis: SafetyAxisId | "general";
};

export type SafetyAxes = Record<SafetyAxisId, number>;

export const SAFETY_AXIS_META: Array<{
  id: SafetyAxisId;
  title: string;
  hint: string;
}> = [
  { id: "person", title: "Человек", hint: "от поражения током" },
  { id: "fire", title: "Пожар", hint: "от нагрева и дуги" },
  { id: "equipment", title: "Техника", hint: "от скачков сети" },
];

function mainCapacityKw(amps: number, phases: "1" | "3"): number {
  return phases === "3"
    ? ((amps * 400 * Math.sqrt(3)) / 1000) * 0.9
    : ((amps * 230) / 1000) * 0.9;
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(5, Math.round(value)));
}

export type PanelSafetyAnalysis = {
  score: number;
  axes: SafetyAxes;
  advice: SafetyAdviceItem[];
};

/**
 * Three-axis heuristic: person (shock), fire (heat/arc), equipment (power quality).
 * Does NOT assess wiring correctness.
 */
export function analyzePanelSafety(
  devices: Device[],
  phases?: "1" | "3",
  powerKw?: number,
  hasGround?: boolean,
  options?: { schemeOnly?: boolean },
): PanelSafetyAnalysis {
  const schemeOnly = options?.schemeOnly ?? false;
  const rail = devices.filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );
  const advice: SafetyAdviceItem[] = [];
  const has = (type: Device["type"]) =>
    rail.some((device) => device.type === type);
  const count = (type: Device["type"]) =>
    rail.filter((device) => device.type === type).length;

  const hasLeakage = has("rcd") || has("diff_breaker");
  const loadsComplete = allPanelLoadsIdentified(rail);
  const main = rail.find((device) => device.type === "main_breaker");
  const lineProtection = count("breaker") + count("diff_breaker");
  const paramsReady = Boolean(phases && powerKw != null && powerKw > 0);

  if (!loadsComplete && !schemeOnly) {
    advice.push({
      id: "line_loads",
      axis: "general",
      kind: "improve",
      title: "Определите нагрузки по всем приборам",
      detail:
        "Оценка появится, когда для каждого автомата и дифавтомата будет указано, какие помещения и техника на нём.",
    });
  }
  if (!paramsReady) {
    advice.push({
      id: "params",
      axis: "general",
      kind: "improve",
      title: "Заполните параметры сети",
      detail:
        "Укажите число фаз, выделенную мощность и землю — без этого оценка неполная.",
    });
  }

  let person = 38;
  if (hasLeakage) {
    person += 38;
    advice.push({
      id: "rcd",
      axis: "person",
      kind: "good",
      title: "Есть защита от утечки",
      detail: has("diff_breaker")
        ? "Дифавтомат отключает линию и при коротком замыкании, и при утечке тока — это защита человека от поражения."
        : "УЗО отслеживает утечку тока и отключает питание, если человек коснулся корпуса или повреждённой изоляции.",
    });
  } else {
    person -= 22;
    advice.push({
      id: "rcd",
      axis: "person",
      kind: "improve",
      title: "Добавьте УЗО или дифавтомат",
      detail:
        "Сейчас нет защиты человека от тока утечки. Для розеточных линий обычно ставят УЗО 30 мА или дифавтомат.",
    });
  }
  if (hasGround === true) {
    person += 22;
    advice.push({
      id: "ground",
      axis: "person",
      kind: "good",
      title: "Есть заземление",
      detail:
        "УЗО и дифавтоматы работают штатно, а металлические корпуса можно безопасно занулить через PE.",
    });
  } else if (hasGround === false) {
    person -= 18;
    advice.push({
      id: "ground",
      axis: "person",
      kind: "improve",
      title: "Нет заземления",
      detail:
        "Без PE корпуса техники остаются опасными при пробое. В квартире уточните у УК, можно ли подключить PE; в доме контур делает электрик.",
    });
  } else {
    advice.push({
      id: "ground",
      axis: "person",
      kind: "improve",
      title: "Укажите, есть ли земля",
      detail:
        "Откройте параметры сети и отметьте наличие PE. Заземление сильнее всего влияет на защиту человека.",
    });
  }

  let fire = 36;
  if (has("main_breaker")) {
    fire += 16;
    advice.push({
      id: "main_breaker",
      axis: "fire",
      kind: "good",
      title: "Есть вводной автомат",
      detail:
        "Он ограничивает общий ток и отключает щиток при перегрузке или коротком замыкании на вводе.",
    });
  } else {
    fire -= 12;
    advice.push({
      id: "main_breaker",
      axis: "fire",
      kind: "improve",
      title: "Поставьте вводной автомат",
      detail:
        "Без него нет общей защиты: при аварии на вводе линии могут не отключиться вовремя.",
    });
  }
  if (lineProtection >= 3) {
    fire += 12;
    advice.push({
      id: "lines",
      axis: "fire",
      kind: "good",
      title: "Линии разведены по автоматам",
      detail: `На схеме ${lineProtection} защищённых линий — свет и розетки не сидят на одном автомате.`,
    });
  } else if (lineProtection >= 1) {
    fire += 6;
    advice.push({
      id: "lines",
      axis: "fire",
      kind: "improve",
      title: "Разведите линии по отдельным автоматам",
      detail:
        "Свет, розетки кухни и мощную технику лучше сажать на свои автоматы — так авария не обесточит весь дом и кабель не останется без своей защиты.",
    });
  } else {
    fire -= 8;
    advice.push({
      id: "lines",
      axis: "fire",
      kind: "improve",
      title: "Нет автоматов на линии",
      detail:
        "Кроме ввода нужны автоматы на отдельные группы. Иначе кабель линии может остаться без защиты.",
    });
  }
  if (has("afdd")) {
    fire += 10;
    advice.push({
      id: "afdd",
      axis: "fire",
      kind: "good",
      title: "Есть защита от дуги (УЗДП)",
      detail:
        "Прибор ловит искрение в проводке — редкая, но важная защита от пожара.",
    });
  } else {
    advice.push({
      id: "afdd",
      axis: "fire",
      kind: "improve",
      title: "Можно добавить УЗДП",
      detail:
        "Защита от дугового пробоя снижает риск пожара из‑за плохих контактов.",
    });
  }
  if (hasLeakage) fire += 8;
  if (loadsComplete && !schemeOnly) {
    const mismatched = rail.filter((device) =>
      assessDeviceLineLoadSafety(device),
    );
    if (mismatched.length > 0) {
      fire -= Math.min(24, 8 + mismatched.length * 6);
      advice.push({
        id: "load_mismatch",
        axis: "fire",
        kind: "improve",
        title:
          mismatched.length === 1
            ? "Один автомат слабее своей нагрузки"
            : mismatched.length < 5
              ? `${mismatched.length} прибора не соответствуют нагрузке`
              : `${mismatched.length} приборов не соответствуют нагрузке`,
        detail:
          "Номинал слабее выбранных розеток и техники — риск отключений и нагрева кабеля. На схеме такие приборы отмечены красной линией.",
      });
    } else if (rail.some((device) => deviceNeedsLineIdentification(device.type))) {
      fire += 8;
      advice.push({
        id: "load_mismatch",
        axis: "fire",
        kind: "good",
        title: "Нагрузки согласованы с номиналами",
        detail:
          "Указанные помещения и техника не превышают то, на что рассчитаны автоматы на схеме.",
      });
    }
  }
  if (main && phases && powerKw != null && powerKw > 0) {
    const amps = parseAmps(main.rating);
    if (amps) {
      const capacityKw = mainCapacityKw(amps, phases);
      if (powerKw <= capacityKw) {
        fire += 8;
      } else if (powerKw <= capacityKw * 1.2) {
        fire -= 6;
        advice.push({
          id: "main_rating",
          axis: "fire",
          kind: "improve",
          title: "Вводной автомат на пределе мощности",
          detail:
            "Выделенная мощность почти равна тому, что выдерживает автомат. Иначе ввод будет часто выбивать или греться.",
        });
      } else {
        fire -= 14;
        advice.push({
          id: "main_rating",
          axis: "fire",
          kind: "improve",
          title: "Номинал ввода меньше выделенной мощности",
          detail:
            "Автомат слабее разрешённой мощности по договору. Это стоит проверить в первую очередь.",
        });
      }
    }
  }
  if (powerKw != null && powerKw >= 15 && phases === "1") {
    fire -= 6;
    advice.push({
      id: "high_power_1p",
      axis: "fire",
      kind: "improve",
      title: "Большая мощность на одной фазе",
      detail:
        "От 15 кВт однофазный ввод часто перегружает кабель и автомат.",
    });
  }

  let equipment = 40;
  if (has("voltage_relay")) {
    equipment += 28;
    advice.push({
      id: "voltage_relay",
      axis: "equipment",
      kind: "good",
      title: "Есть реле напряжения",
      detail:
        "Оно отключает питание при скачках и просадках — техника меньше рискует сгореть.",
    });
  } else {
    if (powerKw != null && powerKw >= 10) equipment -= 8;
    advice.push({
      id: "voltage_relay",
      axis: "equipment",
      kind: "improve",
      title: "Поставьте реле напряжения",
      detail:
        powerKw != null && powerKw >= 10
          ? "При выделенной мощности от 10 кВт скачки особенно опасны для техники."
          : "Реле напряжения защитит холодильник, бойлер и электронику при скачках в сети.",
    });
  }
  if (has("spd")) {
    equipment += 18;
    advice.push({
      id: "spd",
      axis: "equipment",
      kind: "good",
      title: "Есть УЗИП",
      detail:
        "Ограничитель импульсных перенапряжений гасит грозовые и коммутационные всплески.",
    });
  } else {
    advice.push({
      id: "spd",
      axis: "equipment",
      kind: "improve",
      title: "Имеет смысл поставить УЗИП",
      detail:
        "Особенно полезен в частном доме и если дом питается воздушной линией.",
    });
  }
  if (main && phases) {
    if (phases === "3" && looksThreePhase(main.poles)) {
      equipment += 6;
      advice.push({
        id: "main_poles",
        axis: "equipment",
        kind: "good",
        title: "Вводной автомат подходит к трём фазам",
        detail: "Число полюсов совпадает с трёхфазным вводом.",
      });
    }
    if (phases === "1" && looksThreePhase(main.poles)) {
      equipment -= 4;
      advice.push({
        id: "main_poles",
        axis: "equipment",
        kind: "improve",
        title: "Вводной автомат на три фазы, а сеть однофазная",
        detail:
          "Для одной фазы обычно ставят 1P+N или 2P. Если фазы указаны неверно — поправьте их в параметрах сети.",
      });
    }
    if (phases === "3" && looksSinglePhase(main.poles)) {
      equipment -= 10;
      advice.push({
        id: "main_poles",
        axis: "equipment",
        kind: "improve",
        title: "Вводной автомат не на все фазы",
        detail:
          "При трёх фазах нужен 3P или 4P. Иначе часть ввода останется без защиты.",
      });
    }
    const amps = parseAmps(main.rating);
    if (amps && powerKw != null && powerKw > 0) {
      const capacityKw = mainCapacityKw(amps, phases);
      if (powerKw <= capacityKw) {
        equipment += 8;
        advice.push({
          id: "main_rating_eq",
          axis: "equipment",
          kind: "good",
          title: "Номинал ввода согласован с мощностью",
          detail: `Автомат примерно на ${amps} А выдерживает заявленные ${String(powerKw).replace(".", ",")} кВт.`,
        });
      } else if (powerKw > capacityKw * 1.2) {
        equipment -= 10;
      } else {
        equipment -= 4;
      }
    }
  }

  const axes: SafetyAxes = {
    person: clampScore(person),
    fire: clampScore(fire),
    equipment: clampScore(equipment),
  };
  const score = clampScore(
    (axes.person + axes.fire + axes.equipment) / 3,
  );

  const improveOrder = [
    "line_loads",
    "params",
    "rcd",
    "ground",
    "main_breaker",
    "load_mismatch",
    "main_rating",
    "lines",
    "main_poles",
    "voltage_relay",
    "high_power_1p",
    "spd",
    "afdd",
    "main_rating_eq",
  ];
  const axisOrder = ["general", "person", "fire", "equipment"] as const;
  advice.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "improve" ? -1 : 1;
    const axisDiff = axisOrder.indexOf(a.axis) - axisOrder.indexOf(b.axis);
    if (axisDiff !== 0) return axisDiff;
    if (a.kind === "improve") {
      return improveOrder.indexOf(a.id) - improveOrder.indexOf(b.id);
    }
    return 0;
  });

  return { score, axes, advice };
}

export function computePanelSafetyScore(
  devices: Device[],
  phases: "1" | "3",
  powerKw: number,
  hasGround?: boolean,
): number {
  return analyzePanelSafety(devices, phases, powerKw, hasGround).score;
}

export function safetyLabel(score: number): string {
  if (score >= 80) return "хороший";
  if (score >= 60) return "средний";
  return "низкий";
}

export function safetyIndicatorColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-lime-500";
  if (score >= 50) return "bg-amber-400";
  if (score >= 35) return "bg-orange-500";
  return "bg-rose-500";
}

export function safetyTextColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-lime-600";
  if (score >= 50) return "text-amber-600";
  if (score >= 35) return "text-orange-600";
  return "text-rose-600";
}

export function safetyBadgeColors(score: number): {
  bg: string;
  text: string;
  hover: string;
} {
  if (score >= 80) {
    return {
      bg: "bg-emerald-500/15",
      text: "text-emerald-700",
      hover: "hover:bg-emerald-500/25",
    };
  }
  if (score >= 65) {
    return {
      bg: "bg-lime-500/15",
      text: "text-lime-700",
      hover: "hover:bg-lime-500/25",
    };
  }
  if (score >= 50) {
    return {
      bg: "bg-amber-400/15",
      text: "text-amber-700",
      hover: "hover:bg-amber-400/25",
    };
  }
  if (score >= 35) {
    return {
      bg: "bg-orange-500/15",
      text: "text-orange-700",
      hover: "hover:bg-orange-500/25",
    };
  }
  return {
    bg: "bg-rose-500/15",
    text: "text-rose-700",
    hover: "hover:bg-rose-500/25",
  };
}

export const safetyScoreDisclaimer =
  "Оценка строится в три этапа: схема и параметры сети, затем нагрузки дома на линиях, и финальное заключение электрика после проверки реальной проводки.";

export function isPanelSafetyKnown(panel: {
  phases?: "1" | "3";
  powerKw?: string;
  safety?: number | null;
}): boolean {
  if (!panel.phases || !panel.powerKw?.trim()) return false;
  return typeof panel.safety === "number" && panel.safety >= 0;
}
