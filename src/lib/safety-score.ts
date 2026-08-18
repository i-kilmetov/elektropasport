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

export type SafetyAdviceItem = {
  id: string;
  title: string;
  detail: string;
  kind: "good" | "improve";
};

function mainCapacityKw(
  amps: number,
  phases: "1" | "3",
): number {
  return phases === "3"
    ? ((amps * 400 * Math.sqrt(3)) / 1000) * 0.9
    : ((amps * 230) / 1000) * 0.9;
}

/**
 * Heuristic safety score from device composition, declared network params,
 * and identified line loads. Does NOT assess wiring correctness.
 */
export function analyzePanelSafety(
  devices: Device[],
  phases?: "1" | "3",
  powerKw?: number,
  hasGround?: boolean,
): { score: number; advice: SafetyAdviceItem[] } {
  const rail = devices.filter(
    (device) => device.type !== "pe_bus" && device.type !== "n_bus",
  );
  const advice: SafetyAdviceItem[] = [];
  let score = 28;

  const has = (type: Device["type"]) =>
    rail.some((device) => device.type === type);
  const count = (type: Device["type"]) =>
    rail.filter((device) => device.type === type).length;

  if (has("main_breaker")) {
    score += 16;
    advice.push({
      id: "main_breaker",
      kind: "good",
      title: "Есть вводной автомат",
      detail:
        "Он ограничивает общий ток и отключает весь щиток при перегрузке или коротком замыкании на вводе.",
    });
  } else {
    score -= 14;
    advice.push({
      id: "main_breaker",
      kind: "improve",
      title: "Поставьте вводной автомат",
      detail:
        "Без него нет общей защиты объекта: при аварии на вводе линии могут не отключиться вовремя. Это один из самых важных приборов в щитке.",
    });
  }

  if (has("rcd") || has("diff_breaker")) {
    score += 22;
    advice.push({
      id: "rcd",
      kind: "good",
      title: "Есть защита от утечки",
      detail: has("diff_breaker")
        ? "Дифавтомат отключает линию и при коротком замыкании, и при утечке тока — это защита человека от поражения."
        : "УЗО отслеживает утечку тока и отключает питание, если человек коснулся корпуса или повреждённой изоляции.",
    });
  } else {
    score -= 18;
    advice.push({
      id: "rcd",
      kind: "improve",
      title: "Добавьте УЗО или дифавтомат",
      detail:
        "Сейчас нет защиты человека от тока утечки. Для розеточных линий обычно ставят УЗО 30 мА или дифавтомат. Это сильнее всего поднимает оценку.",
    });
  }

  if (has("voltage_relay")) {
    score += 12;
    advice.push({
      id: "voltage_relay",
      kind: "good",
      title: "Есть реле напряжения",
      detail:
        "Оно отключает питание при скачках и просадках — техника меньше рискует сгореть.",
    });
  } else {
    advice.push({
      id: "voltage_relay",
      kind: "improve",
      title: "Поставьте реле напряжения",
      detail:
        powerKw != null && powerKw >= 10
          ? "При выделенной мощности от 10 кВт скачки особенно опасны для техники. Реле напряжения отключит щиток, пока сеть не вернётся в норму."
          : "Реле напряжения защитит холодильник, бойлер и электронику при скачках в сети.",
    });
  }

  if (has("spd")) {
    score += 8;
    advice.push({
      id: "spd",
      kind: "good",
      title: "Есть УЗИП",
      detail:
        "Ограничитель импульсных перенапряжений гасит грозовые и коммутационные всплески.",
    });
  } else {
    advice.push({
      id: "spd",
      kind: "improve",
      title: "Имеет смысл поставить УЗИП",
      detail:
        "Особенно полезен в частном доме и если дом питается воздушной линией. В квартире это плюс, но не первая очередь.",
    });
  }

  if (has("afdd")) {
    score += 5;
    advice.push({
      id: "afdd",
      kind: "good",
      title: "Есть защита от дуги (УЗДП)",
      detail:
        "Прибор ловит искрение в проводке — редкая, но важная защита от пожара.",
    });
  } else {
    advice.push({
      id: "afdd",
      kind: "improve",
      title: "Можно добавить УЗДП",
      detail:
        "Защита от дугового пробоя снижает риск пожара из‑за плохих контактов. Это дополнительный шаг, когда основные приборы уже стоят.",
    });
  }

  const loadsComplete = allPanelLoadsIdentified(rail);
  if (!loadsComplete) {
    advice.push({
      id: "line_loads",
      kind: "improve",
      title: "Определите нагрузки по всем приборам",
      detail:
        "Оценка появится, когда для каждого автомата и дифавтомата будет указано, какие помещения и техника на нём. Без этих данных индекс не считается.",
    });
  } else {
    const mismatched = rail.filter((device) =>
      assessDeviceLineLoadSafety(device),
    );
    if (mismatched.length > 0) {
      score -= Math.min(28, 8 + mismatched.length * 6);
      advice.push({
        id: "load_mismatch",
        kind: "improve",
        title:
          mismatched.length === 1
            ? "Один автомат слабее своей нагрузки"
            : mismatched.length < 5
              ? `${mismatched.length} прибора не соответствуют нагрузке`
              : `${mismatched.length} приборов не соответствуют нагрузке`,
        detail:
          "По схеме номинал слабее, чем выбранные розетки и техника. Это повышает риск отключений и нагрева кабеля. На схеме такие приборы отмечены красным.",
      });
    } else if (rail.some((device) => deviceNeedsLineIdentification(device.type))) {
      score += 10;
      advice.push({
        id: "load_mismatch",
        kind: "good",
        title: "Нагрузки согласованы с номиналами",
        detail:
          "Указанные помещения и техника не превышают то, на что рассчитаны автоматы и дифавтоматы на схеме.",
      });
    }
  }

  const lineProtection = count("breaker") + count("diff_breaker");
  if (lineProtection >= 3) {
    score += 10;
    advice.push({
      id: "lines",
      kind: "good",
      title: "Линии разведены по автоматам",
      detail: `На схеме ${lineProtection} защищённых линий — свет и розетки не сидят на одном автомате.`,
    });
  } else if (lineProtection >= 1) {
    score += 5;
    advice.push({
      id: "lines",
      kind: "improve",
      title: "Разведите линии по отдельным автоматам",
      detail:
        "Сейчас мало отдельных линий. Свет, розетки кухни и мощную технику лучше сажать на свои автоматы — так авария не обесточит весь дом.",
    });
  } else {
    score -= 6;
    advice.push({
      id: "lines",
      kind: "improve",
      title: "Нет автоматов на линии",
      detail:
        "Кроме ввода нужны автоматы на отдельные группы. Иначе любая неисправность может погасить всё сразу, а кабель линии останется без своей защиты.",
    });
  }

  const main = rail.find((device) => device.type === "main_breaker");
  if (main && phases) {
    if (phases === "3" && looksThreePhase(main.poles)) {
      score += 6;
      advice.push({
        id: "main_poles",
        kind: "good",
        title: "Вводной автомат подходит к трём фазам",
        detail: "Число полюсов совпадает с трёхфазным вводом.",
      });
    }
    if (phases === "1" && looksThreePhase(main.poles)) {
      score -= 6;
      advice.push({
        id: "main_poles",
        kind: "improve",
        title: "Вводной автомат на три фазы, а сеть однофазная",
        detail:
          "Проверьте параметры: для одной фазы обычно ставят 1P+N или 2P. Если фазы указаны неверно — поправьте их в параметрах сети.",
      });
    }
    if (phases === "3" && looksSinglePhase(main.poles)) {
      score -= 12;
      advice.push({
        id: "main_poles",
        kind: "improve",
        title: "Вводной автомат не на все фазы",
        detail:
          "При трёх фазах нужен 3P или 4P. Иначе часть ввода останется без защиты. Замену делает электрик.",
      });
    }

    const amps = parseAmps(main.rating);
    if (amps && powerKw != null && powerKw > 0) {
      const capacityKw = mainCapacityKw(amps, phases);
      if (powerKw <= capacityKw) {
        score += 10;
        advice.push({
          id: "main_rating",
          kind: "good",
          title: "Номинал ввода согласован с мощностью",
          detail: `Автомат примерно на ${amps} А выдерживает заявленные ${String(powerKw).replace(".", ",")} кВт.`,
        });
      } else if (powerKw <= capacityKw * 1.2) {
        score -= 4;
        advice.push({
          id: "main_rating",
          kind: "improve",
          title: "Вводной автомат на пределе мощности",
          detail:
            "Выделенная мощность почти равна тому, что выдерживает автомат. Имеет смысл уточнить номинал у электрика — иначе ввод будет часто выбивать или греться.",
        });
      } else {
        score -= 16;
        advice.push({
          id: "main_rating",
          kind: "improve",
          title: "Номинал ввода меньше выделенной мощности",
          detail:
            "Автомат слабее, чем разрешённая мощность по договору. Либо занижен номинал на схеме, либо автомат нужно заменить. Это стоит проверить в первую очередь.",
        });
      }
    }
  }

  if (
    powerKw != null &&
    powerKw > 0 &&
    powerKw < 3 &&
    !has("rcd") &&
    !has("diff_breaker")
  ) {
    score -= 4;
  }
  if (powerKw != null && powerKw >= 10 && !has("voltage_relay")) {
    score -= 4;
  }
  if (powerKw != null && powerKw >= 15 && phases === "1") {
    score -= 6;
    advice.push({
      id: "high_power_1p",
      kind: "improve",
      title: "Большая мощность на одной фазе",
      detail:
        "От 15 кВт однофазный ввод часто перегружает кабель и автомат. Обсудите с сетевой трёхфазное подключение или снижение нагрузки.",
    });
  }

  if (hasGround === true) {
    score += 8;
    advice.push({
      id: "ground",
      kind: "good",
      title: "Есть заземление",
      detail:
        "УЗО и дифавтоматы работают штатно, а металлические корпуса можно безопасно занулить через PE.",
    });
  } else if (hasGround === false) {
    score -= 12;
    advice.push({
      id: "ground",
      kind: "improve",
      title: "Нет заземления",
      detail:
        "Без PE защита человека слабее: корпуса техники остаются опасными при пробое. В квартире уточните у УК, можно ли подключить PE; в доме — контур заземления делает электрик.",
    });
  } else {
    advice.push({
      id: "ground",
      kind: "improve",
      title: "Укажите, есть ли земля",
      detail:
        "Откройте параметры сети и отметьте наличие PE. Без этого оценка неполная: заземление сильно влияет на безопасность.",
    });
  }

  if (!phases || powerKw == null || !(powerKw > 0)) {
    advice.push({
      id: "params",
      kind: "improve",
      title: "Заполните параметры сети",
      detail:
        "Укажите число фаз и выделенную мощность — тогда оценка учтёт, подходит ли вводной автомат и не слишком ли большая нагрузка.",
    });
  }

  const verified = rail.filter((device) => device.status === "verified").length;
  if (rail.length > 0) {
    score += Math.round((verified / rail.length) * 8);
    if (verified / rail.length < 0.6) {
      advice.push({
        id: "recognition",
        kind: "improve",
        title: "Не все приборы уверенно распознаны",
        detail:
          "Переснимите щиток при хорошем свете или поправьте характеристики вручную. Чем точнее схема, тем честнее оценка.",
      });
    }
  }

  const improveOrder = [
    "line_loads",
    "params",
    "rcd",
    "main_breaker",
    "load_mismatch",
    "ground",
    "main_rating",
    "main_poles",
    "lines",
    "voltage_relay",
    "high_power_1p",
    "spd",
    "recognition",
    "afdd",
  ];
  advice.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "improve" ? -1 : 1;
    if (a.kind === "improve") {
      return improveOrder.indexOf(a.id) - improveOrder.indexOf(b.id);
    }
    return 0;
  });

  return {
    score: Math.min(100, Math.max(5, Math.round(score))),
    advice,
  };
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

export const safetyScoreDisclaimer =
  "Оценка считается по составу приборов, указанным нагрузкам линий и параметрам сети — числу фаз, выделенной мощности и наличию заземления. Сервис не учитывает, насколько корректно приборы расключены внутри щитка.";

export function isPanelSafetyKnown(panel: {
  phases?: "1" | "3";
  powerKw?: string;
  safety?: number | null;
}): boolean {
  if (!panel.phases || !panel.powerKw?.trim()) return false;
  return typeof panel.safety === "number" && panel.safety >= 0;
}
