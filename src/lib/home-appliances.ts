import type { ApplianceManual, HomeApplianceKind } from "@/types";

export type HomeApplianceCatalogItem = {
  kind: HomeApplianceKind;
  title: string;
  /** Typical rated power for quick fill */
  defaultPowerW: number;
  manuals: ApplianceManual[];
};

export const HOME_APPLIANCE_CATALOG: HomeApplianceCatalogItem[] = [
  {
    kind: "fridge",
    title: "Холодильник",
    defaultPowerW: 200,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/fridge.pdf" },
    ],
  },
  {
    kind: "washer",
    title: "Стиральная машина",
    defaultPowerW: 2000,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/washer.pdf" },
    ],
  },
  {
    kind: "dishwasher",
    title: "Посудомоечная машина",
    defaultPowerW: 1800,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/dishwasher.pdf" },
    ],
  },
  {
    kind: "oven",
    title: "Духовой шкаф",
    defaultPowerW: 3000,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/oven.pdf" },
    ],
  },
  {
    kind: "hob",
    title: "Варочная панель",
    defaultPowerW: 7000,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/hob.pdf" },
    ],
  },
  {
    kind: "ac",
    title: "Кондиционер",
    defaultPowerW: 1500,
    manuals: [{ title: "Инструкция по эксплуатации", url: "/manuals/ac.pdf" }],
  },
  {
    kind: "boiler",
    title: "Бойлер",
    defaultPowerW: 2000,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/boiler.pdf" },
    ],
  },
  {
    kind: "microwave",
    title: "Микроволновка",
    defaultPowerW: 1200,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/microwave.pdf" },
    ],
  },
  {
    kind: "tv",
    title: "Телевизор",
    defaultPowerW: 120,
    manuals: [{ title: "Инструкция по эксплуатации", url: "/manuals/tv.pdf" }],
  },
  {
    kind: "heater",
    title: "Обогреватель",
    defaultPowerW: 1500,
    manuals: [
      { title: "Инструкция по эксплуатации", url: "/manuals/heater.pdf" },
    ],
  },
  {
    kind: "other",
    title: "Другая техника",
    defaultPowerW: 500,
    manuals: [
      { title: "Общая инструкция", url: "/manuals/generic.pdf" },
    ],
  },
];

export function applianceCatalogItem(
  kind: HomeApplianceKind,
): HomeApplianceCatalogItem {
  return (
    HOME_APPLIANCE_CATALOG.find((item) => item.kind === kind) ??
    HOME_APPLIANCE_CATALOG[HOME_APPLIANCE_CATALOG.length - 1]!
  );
}

export function formatAppliancePower(powerW?: number): string {
  if (powerW == null || !Number.isFinite(powerW) || powerW <= 0) return "—";
  if (powerW >= 1000) {
    const kw = powerW / 1000;
    const text = Number.isInteger(kw) ? String(kw) : kw.toFixed(1).replace(".", ",");
    return `${text} кВт`;
  }
  return `${Math.round(powerW)} Вт`;
}

export function createApplianceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `app_${crypto.randomUUID()}`;
  }
  return `app_${Date.now().toString(36)}`;
}
