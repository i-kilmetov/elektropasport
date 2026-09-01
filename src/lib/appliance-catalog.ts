import type { HomeApplianceKind } from "@/types";
import {
  buildApplianceDocUrls,
  buildApplianceSpecs,
  type ApplianceSpec,
  type CatalogApplianceKind,
} from "@/lib/appliance-catalog-enrichment";
import { APPLIANCE_CATALOG_RAW } from "@/lib/appliance-catalog-data";

export type { CatalogApplianceKind };

export type ApplianceCatalogModel = {
  id: string;
  kind: CatalogApplianceKind;
  brand: string;
  model: string;
  /** Maximum rated power in watts */
  maxPowerW: number;
  specs: ApplianceSpec[];
  /** External PDF / docs page — not stored in our DB as a file */
  instructionUrl: string;
  /** External user manual PDF / docs page */
  manualUrl: string;
};

export type CatalogKindOption = {
  id: CatalogApplianceKind;
  title: string;
};

/** Main grid in «Добавить технику». */
export const PRIMARY_CATALOG_KIND_OPTIONS: CatalogKindOption[] = [
  { id: "washer", title: "Стиральная машина" },
  { id: "fridge", title: "Холодильник" },
  { id: "dishwasher", title: "Посудомоечная машина" },
  { id: "oven", title: "Духовой шкаф" },
  { id: "microwave", title: "СВЧ-печь" },
  { id: "dryer", title: "Сушильная машина" },
  { id: "hob", title: "Электрическая / индукционная плита" },
  { id: "ac", title: "Кондиционер" },
  { id: "boiler", title: "Бойлер" },
  { id: "tv", title: "Телевизор" },
  { id: "heater", title: "Обогреватель" },
];

/** Shown after tapping «Другое». */
export const OTHER_CATALOG_KIND_OPTIONS: CatalogKindOption[] = [
  { id: "coffee_maker", title: "Кофемашина" },
  { id: "kettle", title: "Электрический чайник" },
  { id: "toaster", title: "Тостер" },
  { id: "blender_mixer", title: "Блендер / миксер" },
  { id: "food_processor", title: "Кухонный комбайн" },
  { id: "multicooker", title: "Мультиварка / рисоварка" },
  { id: "steamer", title: "Пароварка" },
  { id: "air_fryer", title: "Аэрогриль / фритюрница" },
  { id: "grill", title: "Электрогриль" },
  { id: "juicer", title: "Соковыжималка" },
  { id: "bread_maker", title: "Хлебопечка" },
  { id: "ice_maker", title: "Льдогенератор" },
  { id: "hood", title: "Вытяжка" },
  { id: "wine_cooler", title: "Винный шкаф" },
  { id: "water_dispenser", title: "Кулер / диспенсер воды" },
  { id: "vacuum", title: "Пылесос" },
  { id: "robot_vacuum", title: "Робот-пылесос" },
  { id: "iron", title: "Утюг / отпариватель" },
  { id: "sewing_machine", title: "Швейная машина" },
  { id: "humidifier", title: "Увлажнитель / осушитель" },
  { id: "fan", title: "Вентилятор" },
  { id: "pump", title: "Насос" },
  { id: "sauna", title: "Сауна / инфрокабина" },
];

/** Extra home appliances — only in «Все товары» dropdown. */
export const EXTENDED_CATALOG_KIND_OPTIONS: CatalogKindOption[] = [
  { id: "hair_dryer", title: "Фен" },
  { id: "steam_mop", title: "Паровая швабра" },
  { id: "steam_cleaner", title: "Пароочиститель" },
  { id: "electric_shaver", title: "Электробритва / триммер" },
  { id: "electric_toothbrush", title: "Электрическая зубная щётка" },
  { id: "projector", title: "Проектор" },
  { id: "soundbar", title: "Саундбар" },
  { id: "home_theater", title: "Домашний кинотеатр / AV-ресивер" },
  { id: "router", title: "Wi‑Fi роутер" },
  { id: "smart_speaker", title: "Умная колонка" },
  { id: "electric_fireplace", title: "Электрокамин" },
  { id: "electric_blanket", title: "Электроодеяло" },
  { id: "towel_warmer", title: "Электрополотенцесушитель" },
  { id: "chest_freezer", title: "Морозильный ларь" },
  { id: "minibar", title: "Мини-холодильник" },
  { id: "waffle_maker", title: "Вафельница / блинница" },
  { id: "yogurt_maker", title: "Йогуртница" },
  { id: "electric_knife", title: "Электронож" },
  { id: "meat_slicer", title: "Ломтерезка" },
  { id: "garbage_disposal", title: "Измельчитель пищевых отходов" },
  { id: "warming_drawer", title: "Шкаф для подогрева посуды" },
  {
    id: "baby_food_maker",
    title: "Стерилизатор / подогреватель детского питания",
  },
  { id: "scale", title: "Напольные весы" },
  { id: "massager", title: "Массажёр" },
];

/** All supported home appliance kinds (cards + extended), sorted for pickers. */
export const FULL_CATALOG_KIND_OPTIONS: CatalogKindOption[] = [
  ...PRIMARY_CATALOG_KIND_OPTIONS,
  ...OTHER_CATALOG_KIND_OPTIONS,
  ...EXTENDED_CATALOG_KIND_OPTIONS,
].sort((a, b) => a.title.localeCompare(b.title, "ru"));

/** @deprecated Use FULL_CATALOG_KIND_OPTIONS or quick-pick lists. */
export const CATALOG_KIND_OPTIONS: CatalogKindOption[] =
  FULL_CATALOG_KIND_OPTIONS;

const PRIMARY_KIND_IDS = new Set(
  PRIMARY_CATALOG_KIND_OPTIONS.map((item) => item.id),
);

const QUICK_PICK_KIND_IDS = new Set(
  [...PRIMARY_CATALOG_KIND_OPTIONS, ...OTHER_CATALOG_KIND_OPTIONS].map(
    (item) => item.id,
  ),
);

export function isPrimaryCatalogApplianceKind(
  kind: CatalogApplianceKind,
): boolean {
  return PRIMARY_KIND_IDS.has(kind);
}

export function isQuickPickCatalogApplianceKind(
  kind: CatalogApplianceKind,
): boolean {
  return QUICK_PICK_KIND_IDS.has(kind);
}

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export const APPLIANCE_CATALOG: ApplianceCatalogModel[] =
  APPLIANCE_CATALOG_RAW.map(([kind, brand, model, maxPowerW], index) => {
    const docs = buildApplianceDocUrls(brand, model);
    return {
      id: `${kind}-${slugPart(brand)}-${slugPart(model)}-${index}`,
      kind,
      brand,
      model,
      maxPowerW,
      specs: buildApplianceSpecs(kind, brand, model, maxPowerW),
      instructionUrl: docs.instructionUrl,
      manualUrl: docs.manualUrl,
    };
  });

export function isCatalogApplianceKind(
  kind: string,
): kind is CatalogApplianceKind {
  return FULL_CATALOG_KIND_OPTIONS.some((item) => item.id === kind);
}

export function catalogKindTitle(
  kind: CatalogApplianceKind | HomeApplianceKind,
): string {
  const found = FULL_CATALOG_KIND_OPTIONS.find((item) => item.id === kind);
  if (found) return found.title;
  if (kind === "other") return "Другая техника";
  return "Техника";
}

export function catalogBrandsForKind(kind: CatalogApplianceKind): string[] {
  const brands = new Set<string>();
  for (const item of APPLIANCE_CATALOG) {
    if (item.kind === kind) brands.add(item.brand);
  }
  return [...brands].sort((a, b) => a.localeCompare(b, "ru"));
}

export function catalogModelsForBrand(
  kind: CatalogApplianceKind,
  brand: string,
): ApplianceCatalogModel[] {
  return APPLIANCE_CATALOG.filter(
    (item) => item.kind === kind && item.brand === brand,
  ).sort((a, b) => a.model.localeCompare(b.model, "ru"));
}

export function findCatalogModel(id: string): ApplianceCatalogModel | undefined {
  return APPLIANCE_CATALOG.find((item) => item.id === id);
}
