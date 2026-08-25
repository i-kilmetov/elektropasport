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

export const CATALOG_KIND_OPTIONS: {
  id: CatalogApplianceKind;
  title: string;
}[] = [
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
  return CATALOG_KIND_OPTIONS.some((item) => item.id === kind);
}

export function catalogKindTitle(
  kind: CatalogApplianceKind | HomeApplianceKind,
): string {
  const found = CATALOG_KIND_OPTIONS.find((item) => item.id === kind);
  if (found) return found.title;
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
