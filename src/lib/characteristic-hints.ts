import type { DeviceType } from "@/types";

export type CharacteristicValueOption = {
  value: string;
  meaning: string;
};

export type CharacteristicValueExplain = {
  /** What the current value means on this device. */
  aboutValue: string;
  /** Other typical values for this characteristic and what they are for. */
  otherValues: CharacteristicValueOption[];
};

type ValueCatalog = {
  /** Match key → explanation of that value. */
  values: Record<string, string>;
  /** Ordered list for “what else exists”. */
  order: string[];
  /** Fallback when value is empty / unknown. */
  aboutField: string;
};

function normalizeToken(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,/g, ".")
    .toLowerCase();
}

/** Canonical key for looking up a catalog entry. */
function matchKey(label: string, value: string): string | null {
  const v = value.trim();
  if (!v || v === "—" || v === "-") return null;

  const n = normalizeToken(v);

  if (label === "Кривая отключения") {
    const letter = n.match(/^[bcd]/)?.[0];
    return letter ? letter.toUpperCase() : null;
  }

  if (label === "Полюса") {
    return n.replace(/\s+/g, "").toUpperCase();
  }

  if (label === "Класс") {
    // RCD: ac/a ; SPD: i/ii/iii
    if (/^(ac|a)$/i.test(n)) return n.toUpperCase();
    if (/^i{1,3}$/i.test(n) || /^[123]$/.test(n)) {
      const map: Record<string, string> = {
        "1": "I",
        i: "I",
        "2": "II",
        ii: "II",
        "3": "III",
        iii: "III",
      };
      return map[n] ?? n.toUpperCase();
    }
    return n.toUpperCase();
  }

  if (
    label === "Номинальный ток" ||
    label === "Номинал" ||
    label === "Ток утечки" ||
    label === "Откл. способность" ||
    label === "Un" ||
    label === "Диапазон" ||
    label === "Модули"
  ) {
    // Prefer exact catalog keys after light normalize (16a → 16 A)
    const amps = n.match(/^(\d+(?:\.\d+)?)\s*a$/);
    if (amps && (label === "Номинальный ток" || label === "Номинал")) {
      return `${amps[1]} A`;
    }
    const ma = n.match(/^(\d+(?:\.\d+)?)\s*ma$/);
    if (ma && label === "Ток утечки") {
      return `${ma[1]} mA`;
    }
    const ka = n.match(/^(\d+(?:[.,]\d+)?)\s*(?:ка|ka)?$/);
    if (ka && label === "Откл. способность") {
      const num = ka[1].replace(".", ",");
      return `${num} кА`;
    }
    const volts = n.match(/^(\d+)\s*v$/);
    if (volts && label === "Un") {
      return `${volts[1]} V`;
    }
    return value.trim();
  }

  return value.trim();
}

const POLES: ValueCatalog = {
  aboutField:
    "Число полюсов — сколько проводников прибор разрывает или контролирует.",
  order: ["1P", "1P+N", "2P", "3P", "3P+N", "4P"],
  values: {
    "1P": "Одна фаза. Типично для света и розеток в однофазной сети.",
    "1P+N":
      "Фаза и ноль в одном корпусе. Часто у дифавтоматов и УЗДП на квартирные линии.",
    "2P": "Фаза и ноль (или две фазы). Используют, когда нужно разомкнуть и ноль.",
    "3P": "Три фазы без нуля. Для трёхфазных нагрузок, где ноль не коммутируют.",
    "3P+N":
      "Три фазы и ноль. Для трёхфазных групп с нулевым проводником.",
    "4P": "Четыре полюса (обычно 3 фазы + ноль). На вводе и общих УЗО/дифах.",
  },
};

const CURVE: ValueCatalog = {
  aboutField:
    "Кривая отключения — при какой кратности тока автомат сработает от перегрузки.",
  order: ["B", "C", "D"],
  values: {
    B: "Срабатывает при 3–5× номинала. Для освещения и линий с малыми пусковыми токами.",
    C: "Срабатывает при 5–10× номинала. Универсальный выбор для розеток и бытовой техники.",
    D: "Срабатывает при 10–20× номинала. Для двигателей, насосов и больших пусковых токов.",
  },
};

const NOMINAL_CURRENT: ValueCatalog = {
  aboutField:
    "Номинальный ток — максимальный ток, который прибор может пропускать длительно без отключения.",
  order: ["6 A", "10 A", "16 A", "20 A", "25 A", "32 A", "40 A", "50 A", "63 A", "80 A", "100 A"],
  values: {
    "6 A": "Слабые нагрузки: отдельные светильники, слаботочные цепи.",
    "10 A": "Освещение и лёгкие линии. Обычно с кабелем 1,5 мм².",
    "16 A": "Самый частый номинал розеточных групп. Типично с кабелем 2,5 мм².",
    "20 A": "Более нагруженные розетки или отдельная техника средней мощности.",
    "25 A": "Мощные потребители (духовка, варочная панель малой мощности) или суммарные группы.",
    "32 A": "Мощная техника: плита, проточный нагреватель, крупные нагрузки.",
    "40 A": "Ввод или мощные группы в квартире / небольшом доме (часто ~7–9 кВт).",
    "50 A": "Усиленный ввод под более высокую выделенную мощность.",
    "63 A": "Ввод частного дома или мощный объект (~10–15 кВт и выше).",
    "80 A": "Мощный ввод; сечение кабеля и договор должны соответствовать.",
    "100 A": "Крупный ввод / коммерческий объект. Подбирают по проекту.",
  },
};

const BREAKING: ValueCatalog = {
  aboutField:
    "Отключающая способность — какой ток короткого замыкания автомат выдержит, не разрушившись.",
  order: ["4,5 кА", "6 кА", "10 кА", "15 кА"],
  values: {
    "4,5 кА": "Базовый уровень для квартирных групповых автоматов при умеренном токе КЗ.",
    "6 кА": "Частый выбор для квартир и небольших домов — запас по току КЗ на вводе.",
    "10 кА": "Ближе к вводу или при высоком возможном токе КЗ (частный дом, мощная сеть).",
    "15 кА": "Высокая отключающая способность — для жёстких условий на вводе.",
  },
};

const LEAKAGE: ValueCatalog = {
  aboutField:
    "Ток утечки — при какой утечке на землю сработает УЗО или дифавтомат.",
  order: ["10 mA", "30 mA", "100 mA", "300 mA"],
  values: {
    "10 mA":
      "Повышенная чувствительность. Для ванной, душа и зон с высоким риском поражения током.",
    "30 mA":
      "Стандарт для розеток, кухни и влажных зон — защита человека от утечки.",
    "100 mA":
      "Грубее: чаще как противопожарная / селективная защита, не основная для розеток.",
    "300 mA":
      "Противопожарная или вводная защита. Не заменяет 30 mA на розеточных группах.",
  },
};

const RCD_CLASS: ValueCatalog = {
  aboutField: "Класс УЗО — на какие формы тока утечки реагирует прибор.",
  order: ["A", "AC"],
  values: {
    A: "Реагирует на переменный и пульсирующий постоянный ток. Современный стандарт для быта.",
    AC: "Только синусоидальный переменный ток. Устаревающий вариант, хуже для электроники.",
  },
};

const SPD_CLASS: ValueCatalog = {
  aboutField: "Класс УЗИП — от каких импульсов и на каком уровне сети ставят защиту.",
  order: ["I", "II", "III"],
  values: {
    I: "Самый мощный класс — на вводе здания, крупные импульсы (гроза, коммутации).",
    II: "Основной класс для щитка после ввода — типовая защита квартиры/дома.",
    III: "Точечная защита у чувствительной техники (розетка, удлинитель, ИБП).",
  },
};

const UN: ValueCatalog = {
  aboutField: "Un — номинальное напряжение сети, на которое рассчитан УЗИП.",
  order: ["230 V", "400 V"],
  values: {
    "230 V": "Однофазная сеть 230 В (фаза–ноль).",
    "400 V": "Трёхфазная сеть 400 В (между фазами).",
  },
};

const RANGE: ValueCatalog = {
  aboutField:
    "Диапазон реле напряжения — границы, за которыми нагрузка будет отключена.",
  order: ["140–280 V", "160–280 V", "170–270 V"],
  values: {
    "140–280 V":
      "Широкий коридор: реже ложные отключения, но пропускает более сильные просадки/скачки.",
    "160–280 V":
      "Средний компромисс — типичный заводской диапазон многих реле.",
    "170–270 V":
      "Уже коридор: чувствительнее к качеству сети, чаще отключает при отклонениях.",
  },
};

const MODULES: ValueCatalog = {
  aboutField: "Модули — сколько мест на DIN-рейке занимает корпус (1 модуль ≈ 18 мм).",
  order: ["1", "2", "3", "4"],
  values: {
    "1": "Один модуль — узкий однополюсный автомат или компактное реле.",
    "2": "Два модуля — типичное УЗО 2P, дифавтомат 1P+N, двухполюсный автомат.",
    "3": "Три модуля — трёхполюсные автоматы и часть трёхфазных приборов.",
    "4": "Четыре модуля — 4P УЗО/диф, широкие вводные аппараты.",
  },
};

const CATALOGS: Record<string, ValueCatalog> = {
  Полюса: POLES,
  "Кривая отключения": CURVE,
  "Номинальный ток": NOMINAL_CURRENT,
  Номинал: NOMINAL_CURRENT,
  "Откл. способность": BREAKING,
  "Ток утечки": LEAKAGE,
  Un: UN,
  Диапазон: RANGE,
  Модули: MODULES,
};

function catalogFor(label: string, value: string): ValueCatalog | null {
  if (label === "Класс") {
    const key = matchKey(label, value);
    if (key === "A" || key === "AC") return RCD_CLASS;
    if (key === "I" || key === "II" || key === "III") return SPD_CLASS;
    // Unknown class value — prefer RCD wording if looks like letter, else SPD
    if (key && /^[ABC]+$/i.test(key)) return RCD_CLASS;
    return SPD_CLASS;
  }
  return CATALOGS[label] ?? null;
}

function displayValueLabel(catalogKey: string, rawValue: string): string {
  return catalogKey || rawValue.trim();
}

/**
 * Explain the selected characteristic value, then list other typical values.
 */
export function getCharacteristicValueExplain(
  label: string,
  value: string,
  _deviceType?: DeviceType,
): CharacteristicValueExplain {
  const catalog = catalogFor(label, value);

  if (!catalog) {
    // Manufacturer / type / unknown — keep field-level text, no fake value list
    if (label === "Производитель") {
      return {
        aboutValue: value.trim()
          ? `Производитель «${value.trim()}» — бренд с корпуса или по распознаванию фото. Подтвердите по маркировке, если важно для замены.`
          : "Производитель не указан. Его можно выбрать вручную по надписи на корпусе.",
        otherValues: [],
      };
    }
    if (label === "Тип") {
      return {
        aboutValue: value.trim()
          ? `Тип «${value.trim()}» задаёт роль прибора в щитке и набор характеристик.`
          : "Тип прибора не указан.",
        otherValues: [],
      };
    }
    return {
      aboutValue:
        getCharacteristicHint(label) +
        (value.trim() && value !== "—"
          ? ` Сейчас указано: ${value.trim()}.`
          : ""),
      otherValues: [],
    };
  }

  const key = matchKey(label, value);
  const aboutValue =
    key && catalog.values[key]
      ? `Значение «${displayValueLabel(key, value)}»: ${catalog.values[key]}`
      : value.trim() && value !== "—"
        ? `Сейчас указано «${value.trim()}». ${catalog.aboutField}`
        : `Значение не указано (—). ${catalog.aboutField}`;

  const otherValues = catalog.order
    .filter((item) => item !== key)
    .map((item) => ({
      value: item,
      meaning: catalog.values[item],
    }))
    .filter((item) => Boolean(item.meaning));

  return { aboutValue, otherValues };
}

/** Legacy field-level hint (picker sheets / fallbacks). */
const FIELD_HINTS: Record<string, string> = {
  Тип: "Класс прибора по назначению: автомат, УЗО, реле и т.д.",
  Полюса: POLES.aboutField,
  "Кривая отключения": CURVE.aboutField,
  "Номинальный ток": NOMINAL_CURRENT.aboutField,
  "Откл. способность": BREAKING.aboutField,
  Модули: MODULES.aboutField,
  "Ток утечки": LEAKAGE.aboutField,
  Класс:
    "Для УЗО — тип чувствительности (A, AC). Для УЗИП — класс защиты (I, II, III).",
  Un: UN.aboutField,
  Диапазон: RANGE.aboutField,
  Номинал: NOMINAL_CURRENT.aboutField,
  Производитель:
    "Бренд на корпусе или по фото. Не гарантирует подлинность изделия.",
};

export function getCharacteristicHint(label: string): string {
  return (
    FIELD_HINTS[label] ??
    "Параметр с маркировки прибора или каталога. Точное значение лучше уточнить у электрика."
  );
}
