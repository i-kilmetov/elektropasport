import type { Device, DeviceType } from "@/types";
import { getCharacteristicHint } from "@/lib/characteristic-hints";
import {
  DEVICE_TYPE_OPTIONS,
  MANUFACTURER_BRANDS,
} from "@/lib/manufacturer-brands";

export type SpecFieldGuide = {
  key: string;
  options: string[];
  howToPick: string;
};

export type DeviceSpecGuide = {
  title: string;
  intro: string;
  fields: SpecFieldGuide[];
  footnote: string;
};

const RAIL_TYPES = [
  "main_breaker",
  "breaker",
  "rcd",
  "diff_breaker",
  "voltage_relay",
  "spd",
  "afdd",
] as const;

export type RailDeviceType = (typeof RAIL_TYPES)[number];

export const deviceSpecGuide: Record<RailDeviceType, DeviceSpecGuide> = {
  main_breaker: {
    title: "Вводной автомат",
    intro:
      "Ограничивает общую мощность объекта. Номинал не должен быть больше, чем выделенная мощность и сечение вводного кабеля.",
    fields: [
      {
        key: "Полюса",
        options: ["2P", "3P", "4P"],
        howToPick:
          "1 фаза — обычно 2P (фаза + ноль). 3 фазы — 3P или 4P (с нулём). Смотрите на вводной кабель и договор.",
      },
      {
        key: "Номинальный ток",
        options: ["40 A", "50 A", "63 A", "80 A", "100 A"],
        howToPick:
          "Считают от выделенной мощности: I ≈ P / (U × cos φ). Для квартиры 7–10 кВт часто ставят 40–63 A.",
      },
      {
        key: "Кривая отключения",
        options: ["C", "D"],
        howToPick:
          "На вводе почти всегда C. D — если много двигателей с большим пусковым током.",
      },
      {
        key: "Откл. способность",
        options: ["6 кА", "10 кА", "15 кА"],
        howToPick:
          "Должна быть не ниже возможного тока КЗ на вводе. В квартирах часто хватает 6 кА.",
      },
    ],
    footnote:
      "Вводной автомат — первая защита всего щитка. Если сомневаетесь в номинале — лучше уточнить у электрика.",
  },
  breaker: {
    title: "Автоматический выключатель",
    intro:
      "Защищает одну линию — розетки, свет, технику. Подбирают по нагрузке линии и сечению провода.",
    fields: [
      {
        key: "Полюса",
        options: ["1P", "2P", "3P"],
        howToPick:
          "1P — одна фаза (типично для розеток и света). 2P — фаза + ноль. 3P — только для трёхфазных линий.",
      },
      {
        key: "Номинальный ток",
        options: ["6 A", "10 A", "16 A", "20 A", "25 A", "32 A", "40 A", "63 A"],
        howToPick:
          "Свет — 10 A, розетки — 16 A, мощная техника — 20–32 A. Провод 1,5 мм² — до 16 A, 2,5 мм² — до 25 A.",
      },
      {
        key: "Кривая отключения",
        options: ["B", "C", "D"],
        howToPick:
          "B — освещение. C — розетки и бытовая техника (самое частое). D — двигатели и большие пусковые токи.",
      },
      {
        key: "Откл. способность",
        options: ["4,5 кА", "6 кА", "10 кА"],
        howToPick:
          "Для групповых автоматов в квартире обычно 4,5–6 кА. В частном доме с мощным вводом — выше.",
      },
    ],
    footnote:
      "Автомат защищает провод, а не прибор. Номинал линии не должен превышать допустимый ток кабеля.",
  },
  rcd: {
    title: "УЗО",
    intro:
      "Защищает от утечки тока на землю. Номинал по току должен быть не меньше суммы линий, которые через него идут.",
    fields: [
      {
        key: "Полюса",
        options: ["2P", "4P"],
        howToPick:
          "2P — одна фаза + ноль. 4P — три фазы + ноль. Количество полюсов должно совпадать с сетью.",
      },
      {
        key: "Номинальный ток",
        options: ["25 A", "40 A", "63 A", "80 A"],
        howToPick:
          "Берут с запасом от суммарной нагрузки групп. Для квартиры часто 40 A, для нескольких линий — 63 A.",
      },
      {
        key: "Ток утечки",
        options: ["10 mA", "30 mA", "100 mA", "300 mA"],
        howToPick:
          "30 mA — розетки, ванная, кухня. 10 mA — повышенная защита во влажных зонах. 100–300 mA — ввод или противопожарное.",
      },
      {
        key: "Класс",
        options: ["AC", "A"],
        howToPick:
          "A — современный стандарт, реагирует на разные типы утечек. AC — только на переменный ток (устаревает).",
      },
    ],
    footnote:
      "УЗО не защищает от перегрузки — только от утечки. Часто ставят вместе с автоматами.",
  },
  diff_breaker: {
    title: "Дифавтомат",
    intro:
      "Объединяет автомат и УЗО: защищает линию и от перегрузки, и от утечки. Удобен на отдельных группах.",
    fields: [
      {
        key: "Полюса",
        options: ["1P+N", "2P", "3P+N", "4P"],
        howToPick:
          "1P+N — одна фаза для квартиры. 2P — фаза + ноль. Для трёхфазных линий — 3P+N или 4P.",
      },
      {
        key: "Номинальный ток",
        options: ["10 A", "16 A", "20 A", "25 A", "32 A", "40 A"],
        howToPick:
          "Как у автомата линии: свет 10 A, розетки 16 A, мощные потребители — 20–32 A.",
      },
      {
        key: "Кривая отключения",
        options: ["B", "C"],
        howToPick: "C — универсально для розеток. B — если линия только на освещение.",
      },
      {
        key: "Ток утечки",
        options: ["10 mA", "30 mA"],
        howToPick:
          "30 mA — стандарт для розеточных групп. 10 mA — ванная, душ, зона повышенного риска.",
      },
    ],
    footnote:
      "Дифавтомат дороже пары «автомат + УЗО», но занимает меньше места на рейке.",
  },
  voltage_relay: {
    title: "Реле напряжения",
    intro:
      "Отключает нагрузку при слишком низком или высоком напряжении в сети.",
    fields: [
      {
        key: "Номинальный ток",
        options: ["16 A", "25 A", "32 A", "40 A", "63 A"],
        howToPick:
          "Ток реле должен быть не меньше нагрузки, которую оно коммутирует — часто ставят на ввод или группу техники.",
      },
      {
        key: "Диапазон",
        options: ["140–280 V", "160–280 V", "170–270 V"],
        howToPick:
          "Смотрите типичное напряжение в вашей сети. Узкий диапазон — чувствительнее, но чаще отключает.",
      },
    ],
    footnote:
      "Полезно при нестабильной сети. Не заменяет защиту от КЗ и утечки.",
  },
  spd: {
    title: "УЗИП",
    intro:
      "Принимает импульсные перенапряжения — от грозы, коммутаций в сети, скачков на линии.",
    fields: [
      {
        key: "Класс",
        options: ["I", "II", "III"],
        howToPick:
          "I — на вводе (мощные импульсы). II — в щитке после ввода. III — точечно у чувствительной техники.",
      },
      {
        key: "Полюса",
        options: ["1P", "1P+N", "3P", "3P+N", "4P"],
        howToPick: "Должны соответствовать схеме: однофазная или трёхфазная сеть.",
      },
      {
        key: "Un",
        options: ["230 V", "400 V"],
        howToPick: "230 V — однофазная сеть. 400 V — трёхфазная.",
      },
    ],
    footnote:
      "УЗИП снижает риск для электроники, но не защищает от длительного завышения напряжения — для этого нужно реле.",
  },
  afdd: {
    title: "УЗДП",
    intro:
      "Распознаёт дуговой пробой в проводке и отключает линию до возгорания.",
    fields: [
      {
        key: "Полюса",
        options: ["1P+N", "2P"],
        howToPick: "1P+N — типично для квартирных линий. 2P — фаза + ноль с полным разрывом.",
      },
      {
        key: "Номинальный ток",
        options: ["10 A", "16 A", "20 A", "25 A", "32 A"],
        howToPick:
          "Как у автомата защищаемой линии. Часто ставят на старую проводку или скрытые группы.",
      },
      {
        key: "Кривая отключения",
        options: ["B", "C"],
        howToPick: "C — для смешанных линий. B — если линия только на свет.",
      },
    ],
    footnote:
      "Дополнительная пожаробезопасность. Не заменяет УЗО и автомат.",
  },
};

export function getDeviceSpecGuide(
  type: DeviceType,
): DeviceSpecGuide | null {
  if (type === "pe_bus" || type === "n_bus") return null;
  return deviceSpecGuide[type as RailDeviceType] ?? null;
}

export function getSpecFieldOptions(
  type: DeviceType,
  fieldKey: string,
): string[] {
  const guide = getDeviceSpecGuide(type);
  const field = guide?.fields.find((item) => item.key === fieldKey);
  if (field) return field.options;

  const common: Record<string, string[]> = {
    Производитель: MANUFACTURER_BRANDS.map((brand) => brand.label),
    Полюса: ["1P", "1P+N", "2P", "3P", "3P+N", "4P"],
    "Кривая отключения": ["B", "C", "D"],
    "Номинальный ток": ["6 A", "10 A", "16 A", "20 A", "25 A", "32 A", "40 A", "63 A"],
    "Ток утечки": ["10 mA", "30 mA", "100 mA", "300 mA"],
    "Откл. способность": ["4,5 кА", "6 кА", "10 кА", "15 кА"],
    Класс: ["AC", "A", "I", "II", "III"],
    Диапазон: ["140–280 V", "160–280 V", "170–270 V"],
    Un: ["230 V", "400 V"],
    Модули: ["1", "2", "3", "4"],
    Номинал: ["6 A", "10 A", "16 A", "25 A", "32 A", "40 A", "63 A", "10 A / 30 mA", "16 A / 30 mA", "25 A / 30 mA", "40 A / 30 mA", "63 A / 30 mA"],
    Тип: DEVICE_TYPE_OPTIONS.map((item) => item.label),
  };

  return common[fieldKey] ?? [];
}

export function getSpecFieldHint(fieldKey: string): string {
  return getCharacteristicHint(fieldKey);
}

export const manualSpecEditDisclaimer =
  "Если вы меняете характеристики вручную — делайте это только когда уверены в значениях. Сервис не проверяет правильность ручного ввода, ответственность за данные лежит на вас.";

export function syncRatingFromCharacteristics(
  device: Device,
  characteristics: Record<string, string>,
): string {
  const curve = characteristics["Кривая отключения"];
  const nominal =
    characteristics["Номинальный ток"] ?? characteristics["Номинал"];
  const leak = characteristics["Ток утечки"];

  if (
    (device.type === "breaker" ||
      device.type === "main_breaker" ||
      device.type === "afdd" ||
      device.type === "diff_breaker") &&
    curve &&
    nominal
  ) {
    const amps = nominal.replace(/\s*A\b/i, "").trim();
    return `${curve}${amps}`;
  }
  if (device.type === "rcd" && nominal && leak) {
    return `${nominal} / ${leak}`;
  }
  if (nominal) return nominal;
  return device.rating;
}
