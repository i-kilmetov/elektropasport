import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  CookingPot,
  Droplets,
  Flame,
  Heater,
  Microwave,
  Refrigerator,
  Tv,
  WashingMachine,
  Wind,
  Zap,
} from "lucide-react";
import {
  catalogKindTitle,
  type CatalogApplianceKind,
} from "@/lib/appliance-catalog";
import type { HomeApplianceKind } from "@/types";

export {
  APPLIANCE_CATALOG,
  CATALOG_KIND_OPTIONS,
  catalogBrandsForKind,
  catalogKindTitle,
  catalogModelsForBrand,
  findCatalogModel,
  isCatalogApplianceKind,
  type ApplianceCatalogModel,
  type CatalogApplianceKind,
} from "@/lib/appliance-catalog";

/** @deprecated Prefer CATALOG_KIND_OPTIONS + appliance catalog models. */
export type HomeApplianceCatalogItem = {
  kind: HomeApplianceKind;
  title: string;
  defaultPowerW: number;
  manuals: { title: string; url: string }[];
};

/** Legacy defaults kept for older appliances without catalogId. */
export const HOME_APPLIANCE_CATALOG: HomeApplianceCatalogItem[] = [
  { kind: "fridge", title: "Холодильник", defaultPowerW: 200, manuals: [] },
  { kind: "washer", title: "Стиральная машина", defaultPowerW: 2000, manuals: [] },
  {
    kind: "dishwasher",
    title: "Посудомоечная машина",
    defaultPowerW: 1800,
    manuals: [],
  },
  { kind: "oven", title: "Духовой шкаф", defaultPowerW: 3000, manuals: [] },
  { kind: "hob", title: "Варочная панель", defaultPowerW: 7000, manuals: [] },
  { kind: "dryer", title: "Сушильная машина", defaultPowerW: 2500, manuals: [] },
  { kind: "ac", title: "Кондиционер", defaultPowerW: 1500, manuals: [] },
  { kind: "boiler", title: "Бойлер", defaultPowerW: 2000, manuals: [] },
  { kind: "microwave", title: "Микроволновка", defaultPowerW: 1200, manuals: [] },
  { kind: "tv", title: "Телевизор", defaultPowerW: 120, manuals: [] },
  { kind: "heater", title: "Обогреватель", defaultPowerW: 1500, manuals: [] },
  { kind: "other", title: "Другая техника", defaultPowerW: 500, manuals: [] },
];

export function applianceCatalogItem(
  kind: HomeApplianceKind,
): HomeApplianceCatalogItem {
  return (
    HOME_APPLIANCE_CATALOG.find((item) => item.kind === kind) ??
    HOME_APPLIANCE_CATALOG[HOME_APPLIANCE_CATALOG.length - 1]!
  );
}

export function applianceKindLabel(kind: HomeApplianceKind): string {
  return catalogKindTitle(kind);
}

export function applianceKindIcon(
  kind: HomeApplianceKind | CatalogApplianceKind,
): LucideIcon {
  switch (kind) {
    case "fridge":
      return Refrigerator;
    case "washer":
      return WashingMachine;
    case "dishwasher":
      return Droplets;
    case "dryer":
      return Wind;
    case "microwave":
      return Microwave;
    case "oven":
      return Flame;
    case "hob":
      return CookingPot;
    case "ac":
      return AirVent;
    case "boiler":
      return Droplets;
    case "tv":
      return Tv;
    case "heater":
      return Heater;
    default:
      return Zap;
  }
}

export function formatAppliancePower(powerW?: number): string {
  if (powerW == null || !Number.isFinite(powerW) || powerW <= 0) return "—";
  return `${Math.round(powerW)} Вт`;
}

export function createApplianceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `app_${crypto.randomUUID()}`;
  }
  return `app_${Date.now().toString(36)}`;
}
