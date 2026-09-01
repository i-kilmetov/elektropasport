import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  Blend,
  Coffee,
  CookingPot,
  Droplets,
  Fan,
  Flame,
  Heater,
  LayoutGrid,
  Microwave,
  MoreHorizontal,
  Refrigerator,
  Sandwich,
  Scissors,
  Sparkles,
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
  EXTENDED_CATALOG_KIND_OPTIONS,
  FULL_CATALOG_KIND_OPTIONS,
  OTHER_CATALOG_KIND_OPTIONS,
  PRIMARY_CATALOG_KIND_OPTIONS,
  catalogBrandsForKind,
  catalogKindTitle,
  catalogModelsForBrand,
  findCatalogModel,
  isCatalogApplianceKind,
  isPrimaryCatalogApplianceKind,
  isQuickPickCatalogApplianceKind,
  type ApplianceCatalogModel,
  type CatalogApplianceKind,
  type CatalogKindOption,
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

/** Type line in lists — custom free-text type is stored in title when kind is other. */
export function applianceDisplayKindLabel(appliance: {
  kind: HomeApplianceKind;
  title?: string;
  brand?: string;
  catalogId?: string;
}): string {
  if (
    !appliance.catalogId &&
    appliance.kind === "other" &&
    appliance.title?.trim() &&
    appliance.brand?.trim()
  ) {
    return appliance.title.trim();
  }
  return applianceKindLabel(appliance.kind);
}

export function applianceKindIcon(
  kind: HomeApplianceKind | CatalogApplianceKind | "other-picker" | "all-products-picker",
): LucideIcon {
  switch (kind) {
    case "fridge":
    case "wine_cooler":
      return Refrigerator;
    case "washer":
      return WashingMachine;
    case "dishwasher":
    case "boiler":
    case "water_dispenser":
    case "pump":
      return Droplets;
    case "dryer":
    case "hair_dryer":
      return Wind;
    case "microwave":
      return Microwave;
    case "oven":
    case "grill":
    case "air_fryer":
      return Flame;
    case "hob":
    case "hood":
      return CookingPot;
    case "ac":
      return AirVent;
    case "tv":
    case "projector":
      return Tv;
    case "heater":
    case "sauna":
      return Heater;
    case "coffee_maker":
      return Coffee;
    case "toaster":
      return Sandwich;
    case "blender_mixer":
    case "food_processor":
    case "juicer":
      return Blend;
    case "vacuum":
    case "robot_vacuum":
    case "humidifier":
    case "fan":
      return Fan;
    case "iron":
    case "sewing_machine":
      return Scissors;
    case "kettle":
    case "steamer":
    case "multicooker":
    case "bread_maker":
    case "ice_maker":
      return Sparkles;
    case "router":
    case "smart_speaker":
    case "soundbar":
    case "home_theater":
      return Zap;
    case "other-picker":
      return MoreHorizontal;
    case "all-products-picker":
      return LayoutGrid;
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
