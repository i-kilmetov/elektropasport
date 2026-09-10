/**
 * Rough market-aligned estimates for electrical design & install (RU, ₽).
 * Not a quote — used for education / lead qualification in no-panel flows.
 */

export type DwellingKind = "apartment" | "house";

export type DesignCalcInput = {
  areaM2: number;
  rooms: number;
  wetZones: number;
  dwelling: DwellingKind;
};

export type DesignCalcResult = {
  totalRub: number;
  perM2Rub: number;
  breakdown: { label: string; amountRub: number }[];
};

/** Design: base + area + rooms + wet zones; house multiplier. */
export function estimateElectricalDesignCost(
  input: DesignCalcInput,
): DesignCalcResult {
  const area = clamp(Math.round(input.areaM2), 20, 400);
  const rooms = clamp(Math.round(input.rooms), 1, 12);
  const wet = clamp(Math.round(input.wetZones), 0, 6);
  const houseMul = input.dwelling === "house" ? 1.35 : 1;

  const base = 12_000;
  const areaPart = area * 220;
  const roomsPart = Math.max(0, rooms - 1) * 2_800;
  const wetPart = wet * 3_500;
  const raw = (base + areaPart + roomsPart + wetPart) * houseMul;
  const totalRub = roundHundreds(raw);
  const breakdown = [
    { label: "Базовый комплект документации", amountRub: roundHundreds(base * houseMul) },
    { label: `Площадь ${area} м²`, amountRub: roundHundreds(areaPart * houseMul) },
    {
      label: `Комнаты (${rooms})`,
      amountRub: roundHundreds(roomsPart * houseMul),
    },
    {
      label: `Влажные зоны (${wet})`,
      amountRub: roundHundreds(wetPart * houseMul),
    },
  ].filter((row) => row.amountRub > 0);

  return {
    totalRub,
    perM2Rub: Math.round(totalRub / area),
    breakdown,
  };
}

export type InstallCalcInput = {
  areaM2: number;
  rooms: number;
  pointsPerRoom: number;
  dwelling: DwellingKind;
  /** Include apartment panel assembly in estimate */
  withPanel: boolean;
};

export type InstallCalcResult = {
  totalRub: number;
  breakdown: { label: string; amountRub: number }[];
};

/**
 * Install rough-in + points + optional panel.
 * Inspired by typical turnkey per-m² + per-point pricing.
 */
export function estimateElectricalInstallCost(
  input: InstallCalcInput,
): InstallCalcResult {
  const area = clamp(Math.round(input.areaM2), 20, 400);
  const rooms = clamp(Math.round(input.rooms), 1, 12);
  const pointsPerRoom = clamp(Math.round(input.pointsPerRoom), 4, 16);
  const houseMul = input.dwelling === "house" ? 1.25 : 1;

  const cableAndChase = area * 980;
  const points = rooms * pointsPerRoom * 850;
  const panel = input.withPanel ? 22_000 + rooms * 1_800 : 0;
  const commissioning = 8_000;

  const raw = (cableAndChase + points + panel + commissioning) * houseMul;
  const totalRub = roundHundreds(raw);

  const breakdown = [
    {
      label: "Штробы, кабель, черновой монтаж",
      amountRub: roundHundreds(cableAndChase * houseMul),
    },
    {
      label: `Точки (${rooms * pointsPerRoom} шт.)`,
      amountRub: roundHundreds(points * houseMul),
    },
    ...(panel
      ? [
          {
            label: "Сборка и установка щитка",
            amountRub: roundHundreds(panel * houseMul),
          },
        ]
      : []),
    {
      label: "Пусконаладка и проверка",
      amountRub: roundHundreds(commissioning * houseMul),
    },
  ];

  return { totalRub, breakdown };
}

export type FloorUpgradeId =
  | "replace_fuses"
  | "apartment_panel_minimal"
  | "apartment_panel_full"
  | "selective_rewire"
  | "full_rewire";

export type FloorUpgradeOption = {
  id: FloorUpgradeId;
  title: string;
  subtitle: string;
  fromRub: number;
  toRub: number;
  forFuses: boolean;
  forBreaker: boolean;
  level: "simple" | "medium" | "deep";
};

/** Corridor / floor-panel only: upgrade ladder from cheap to full rewire. */
export const FLOOR_PANEL_UPGRADES: FloorUpgradeOption[] = [
  {
    id: "replace_fuses",
    title: "Заменить пробки на автомат",
    subtitle:
      "Быстрый шаг безопасности в этажном щите: современный вводной автомат вместо керамических пробок.",
    fromRub: 4_000,
    toRub: 12_000,
    forFuses: true,
    forBreaker: false,
    level: "simple",
  },
  {
    id: "apartment_panel_minimal",
    title: "Квартирный щиток у входа",
    subtitle:
      "Свой щиток в квартире: ввод, УЗО/диф, 3–5 групп. Этажный щит остаётся точкой учёта/ввода.",
    fromRub: 25_000,
    toRub: 55_000,
    forFuses: true,
    forBreaker: true,
    level: "simple",
  },
  {
    id: "apartment_panel_full",
    title: "Щиток + разделение линий",
    subtitle:
      "Кухня, санузел, розетки и свет по отдельным автоматам. Меньше отключений всей квартиры.",
    fromRub: 45_000,
    toRub: 95_000,
    forFuses: true,
    forBreaker: true,
    level: "medium",
  },
  {
    id: "selective_rewire",
    title: "Частичная замена проводки",
    subtitle:
      "Новые линии на кухню и санузел + щиток. Остальное — по состоянию и бюджету.",
    fromRub: 90_000,
    toRub: 180_000,
    forFuses: true,
    forBreaker: true,
    level: "medium",
  },
  {
    id: "full_rewire",
    title: "Полная замена электрики",
    subtitle:
      "Новая схема с нуля: трассы, точки, щиток, защита. Максимум безопасности и запас под технику.",
    fromRub: 180_000,
    toRub: 450_000,
    forFuses: true,
    forBreaker: true,
    level: "deep",
  },
];

export function floorUpgradesFor(
  protection: "fuses" | "breaker",
): FloorUpgradeOption[] {
  return FLOOR_PANEL_UPGRADES.filter((o) =>
    protection === "fuses" ? o.forFuses : o.forBreaker,
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundHundreds(n: number): number {
  return Math.round(n / 100) * 100;
}

export function formatEstimateRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function formatEstimateRange(from: number, to: number): string {
  return `${from.toLocaleString("ru-RU")}–${to.toLocaleString("ru-RU")} ₽`;
}
