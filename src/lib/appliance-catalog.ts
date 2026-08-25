import type { HomeApplianceKind } from "@/types";
import {
  buildApplianceDocUrls,
  buildApplianceSpecs,
  type ApplianceSpec,
} from "@/lib/appliance-catalog-enrichment";

/** Appliance kinds available in the home catalog picker. */
export type CatalogApplianceKind =
  | "washer"
  | "fridge"
  | "oven"
  | "microwave"
  | "dryer"
  | "hob";

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
  { id: "oven", title: "Духовой шкаф" },
  { id: "microwave", title: "СВЧ-печь" },
  { id: "dryer", title: "Сушильная машина" },
  { id: "hob", title: "Электрическая / индукционная плита" },
];

/** Compact rows: [kind, brand, model, maxPowerW] */
const RAW: Array<[CatalogApplianceKind, string, string, number]> = [
  // —— Стиральные машины ——
  ["washer", "Bosch", "WAN28290", 2300],
  ["washer", "Bosch", "WAJ24060", 2200],
  ["washer", "Bosch", "WGA244X0ME", 2300],
  ["washer", "Bosch", "Serie 6 WAU28S90", 2300],
  ["washer", "Siemens", "WM14N2G1", 2300],
  ["washer", "Siemens", "WG44G2F40", 2300],
  ["washer", "Siemens", "iQ300 WM14N290", 2200],
  ["washer", "LG", "F2V5HS0W", 2100],
  ["washer", "LG", "F4V5VS0W", 2000],
  ["washer", "LG", "F1296NDS4", 2100],
  ["washer", "LG", "TW4V9RW9W", 2000],
  ["washer", "Samsung", "WW80T554DAW", 2000],
  ["washer", "Samsung", "WW70A6S23AE", 2000],
  ["washer", "Samsung", "WW90T554DAE", 2100],
  ["washer", "Samsung", "WW60AG40F0AD", 1900],
  ["washer", "Indesit", "IWSD 5085", 1850],
  ["washer", "Indesit", "BWSA 61051", 1850],
  ["washer", "Indesit", "IWUB 4085", 1850],
  ["washer", "Beko", "WUE 6512", 1800],
  ["washer", "Beko", "WRE 6512", 1800],
  ["washer", "Beko", "WUE 7512", 2000],
  ["washer", "Electrolux", "EW6S4R06W", 2000],
  ["washer", "Electrolux", "PerfectCare 600", 2100],
  ["washer", "Candy", "CS4 1062D", 1950],
  ["washer", "Candy", "RO1496DWMC", 2000],
  ["washer", "Haier", "HW60-BP12929", 2000],
  ["washer", "Haier", "HW80-BP12969", 2100],
  ["washer", "Atlant", "СМА 60У109", 2000],
  ["washer", "Atlant", "СМА 70С1010", 2100],
  ["washer", "Weissgauff", "WM 4947", 2050],
  ["washer", "Weissgauff", "WM 5649", 2100],
  ["washer", "Hotpoint-Ariston", "NM11 945 WW", 1850],
  ["washer", "Hotpoint-Ariston", "RST 7029", 1850],
  ["washer", "Gorenje", "WNHI62SAS", 2000],
  ["washer", "Gorenje", "WEI72S3", 2000],
  ["washer", "Miele", "WSD 323", 2400],
  ["washer", "Miele", "WCI 660", 2400],
  ["washer", "Asko", "W2084C", 2200],
  ["washer", "Whirlpool", "FWG71284W", 1850],
  ["washer", "Zanussi", "ZWSO 7100", 1850],

  // —— Холодильники ——
  ["fridge", "Atlant", "ХМ 4625-101", 150],
  ["fridge", "Atlant", "ХМ 4421-000", 140],
  ["fridge", "Atlant", "ХМ 4521-000", 145],
  ["fridge", "Bosch", "KGN39VI306", 160],
  ["fridge", "Bosch", "KGN36VI306", 155],
  ["fridge", "Bosch", "KIS87AFE0", 120],
  ["fridge", "LG", "GA-B509CQWL", 180],
  ["fridge", "LG", "GA-B459CQCL", 170],
  ["fridge", "LG", "GC-B459NLJM", 175],
  ["fridge", "Samsung", "RB37A5470SA", 170],
  ["fridge", "Samsung", "RB34A6B0D12", 165],
  ["fridge", "Samsung", "RT32CG5420S9", 160],
  ["fridge", "Indesit", "DF 4180", 140],
  ["fridge", "Indesit", "ITR 4180", 130],
  ["fridge", "Haier", "C2F636CWRG", 180],
  ["fridge", "Haier", "CEF535AWG", 160],
  ["fridge", "Liebherr", "CNef 4815", 190],
  ["fridge", "Liebherr", "CU 3331", 150],
  ["fridge", "Beko", "RCNK 356K20", 140],
  ["fridge", "Beko", "RCSK 270M20", 130],
  ["fridge", "Electrolux", "EN3854MOX", 160],
  ["fridge", "Electrolux", "LNT7ME46X2", 175],
  ["fridge", "Gorenje", "NRK6201XS4", 155],
  ["fridge", "Gorenje", "NRK6192AXL", 160],
  ["fridge", "Pozis", "RK-149", 130],
  ["fridge", "Biryusa", "M118", 120],
  ["fridge", "Weissgauff", "WRK 1850", 150],
  ["fridge", "Weissgauff", "WRD 2800", 165],
  ["fridge", "Hotpoint-Ariston", "HF 4200", 145],
  ["fridge", "Whirlpool", "WTNF 81", 155],
  ["fridge", "Candy", "CKBN 6200", 140],
  ["fridge", "Siemens", "KG39NAI35", 160],

  // —— Духовые шкафы ——
  ["oven", "Bosch", "HBG517ES0R", 3400],
  ["oven", "Bosch", "HBF011BR0R", 2800],
  ["oven", "Bosch", "Serie 6 HBG578BS0", 3600],
  ["oven", "Siemens", "HB634GBS1", 3650],
  ["oven", "Siemens", "HB513ABR0", 3300],
  ["oven", "Electrolux", "OEF5E50X", 2700],
  ["oven", "Electrolux", "EOE7C31X", 3500],
  ["oven", "Gorenje", "BO6737E02XG", 3300],
  ["oven", "Gorenje", "BO735E20XG", 3500],
  ["oven", "Hansa", "BOEI68433", 3000],
  ["oven", "Hansa", "BOES68402", 2900],
  ["oven", "Weissgauff", "EOA 39", 3000],
  ["oven", "Weissgauff", "EOA 691", 3500],
  ["oven", "Krona", "Siena 45", 2800],
  ["oven", "Krona", "Adel 60", 3200],
  ["oven", "Beko", "BIM 24301", 2500],
  ["oven", "Beko", "BBIM13300X", 3300],
  ["oven", "Hotpoint-Ariston", "FA4 844", 2800],
  ["oven", "Indesit", "IFW 3844", 2600],
  ["oven", "Samsung", "NV70K3370BS", 3650],
  ["oven", "LG", "WSED7726B", 3400],
  ["oven", "Candy", "FCT615NXL", 2800],
  ["oven", "Whirlpool", "AKZ9 6230", 3650],
  ["oven", "Miele", "H 2265", 3500],
  ["oven", "Asko", "OCS8664", 3400],

  // —— СВЧ ——
  ["microwave", "Samsung", "ME83XR", 1150],
  ["microwave", "Samsung", "MS23K3513AS", 1250],
  ["microwave", "Samsung", "MG23K3515AS", 1300],
  ["microwave", "LG", "MS2042DB", 1100],
  ["microwave", "LG", "MS23K3515AS", 1200],
  ["microwave", "LG", "MH6336GIB", 1350],
  ["microwave", "Bosch", "BFL524MS0", 1250],
  ["microwave", "Bosch", "BFL523MS0", 1200],
  ["microwave", "Panasonic", "NN-ST34HB", 1000],
  ["microwave", "Panasonic", "NN-GD37HB", 1100],
  ["microwave", "BBK", "20MWS-721T", 700],
  ["microwave", "BBK", "23MWG-929T", 900],
  ["microwave", "Candy", "CMW20SM", 800],
  ["microwave", "Candy", "CMXG25DCW", 900],
  ["microwave", "Gorenje", "MO20A3B", 800],
  ["microwave", "Gorenje", "MO23A4XH", 900],
  ["microwave", "Weissgauff", "WMO-202", 700],
  ["microwave", "Weissgauff", "WMO-205", 800],
  ["microwave", "Electrolux", "EMM2308X", 900],
  ["microwave", "Whirlpool", "MWD 122", 800],
  ["microwave", "Hotpoint-Ariston", "MWHA 262", 850],
  ["microwave", "Indesit", "MWI 122", 800],
  ["microwave", "Haier", "HMX-DG259", 900],
  ["microwave", "Beko", "MGC20100", 800],
  ["microwave", "Siemens", "BF525LMS0", 1250],

  // —— Сушильные машины ——
  ["dryer", "Bosch", "WTW85561", 2800],
  ["dryer", "Bosch", "WTH85V00", 2600],
  ["dryer", "Bosch", "Serie 6 WTG86400", 2800],
  ["dryer", "Siemens", "WT45H2G0", 2800],
  ["dryer", "Siemens", "WQ45G2D0", 2600],
  ["dryer", "Electrolux", "EW8H458S", 2600],
  ["dryer", "Electrolux", "PerfectCare 800", 2700],
  ["dryer", "Candy", "ROE H9A2TCE", 2500],
  ["dryer", "Candy", "CSOE H9A2TCE", 2500],
  ["dryer", "Beko", "DF7412GA", 2300],
  ["dryer", "Beko", "DF7412CX", 2400],
  ["dryer", "Haier", "HD90-A3979", 2700],
  ["dryer", "Haier", "HD80-A2939", 2500],
  ["dryer", "Weissgauff", "WD 6149", 2500],
  ["dryer", "Weissgauff", "WD 599", 2400],
  ["dryer", "LG", "RC90V9AV2W", 2700],
  ["dryer", "LG", "RC80V9AV2W", 2600],
  ["dryer", "Samsung", "DV90T5240AT", 2800],
  ["dryer", "Samsung", "DV80T5220AX", 2700],
  ["dryer", "Gorenje", "DNE72", 2500],
  ["dryer", "Hotpoint-Ariston", "NT M11 9", 2400],
  ["dryer", "Whirlpool", "FT M22 9", 2500],
  ["dryer", "Miele", "TEF 645", 2800],
  ["dryer", "Asko", "T208H", 2700],

  // —— Плиты / варочные панели (эл. / индукция) ——
  ["hob", "Bosch", "PIE631FB1E", 7400],
  ["hob", "Bosch", "PUE611BB1E", 4600],
  ["hob", "Bosch", "NKN645G17", 6600],
  ["hob", "Siemens", "EH645BFB1E", 7400],
  ["hob", "Siemens", "EX651FEC1E", 7400],
  ["hob", "Electrolux", "EHH6240ISK", 7200],
  ["hob", "Electrolux", "EHH16340FK", 6400],
  ["hob", "Gorenje", "IT640BCSC", 7200],
  ["hob", "Gorenje", "ECT644BCSC", 6600],
  ["hob", "Hansa", "BHI68308", 7200],
  ["hob", "Hansa", "BHCI65123030", 6500],
  ["hob", "Weissgauff", "HI 640", 7200],
  ["hob", "Weissgauff", "HV 640", 6000],
  ["hob", "Krona", "VAZETTI 60", 7000],
  ["hob", "Krona", "FIDATO 60", 6500],
  ["hob", "Beko", "HII 64200", 7200],
  ["hob", "Beko", "HIC 64101", 6600],
  ["hob", "Indesit", "VIA 640", 7200],
  ["hob", "Indesit", "RIA 641", 6400],
  ["hob", "Hotpoint-Ariston", "HR 612", 7200],
  ["hob", "Hotpoint-Ariston", "HR 622", 6600],
  ["hob", "Samsung", "NZ64H3707", 7200],
  ["hob", "Samsung", "NZ64N9777", 7400],
  ["hob", "Candy", "CI642", 7200],
  ["hob", "Whirlpool", "WS Q2160", 7200],
  ["hob", "Miele", "KM 7201", 7400],
  ["hob", "Asko", "HI1655", 7400],
  ["hob", "Maunfeld", "EVI 594", 7200],
  ["hob", "Kuppersberg", "ICS 604", 7200],
];

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export const APPLIANCE_CATALOG: ApplianceCatalogModel[] = RAW.map(
  ([kind, brand, model, maxPowerW], index) => {
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
  },
);

export function isCatalogApplianceKind(
  kind: string,
): kind is CatalogApplianceKind {
  return CATALOG_KIND_OPTIONS.some((item) => item.id === kind);
}

export function catalogKindTitle(kind: CatalogApplianceKind | HomeApplianceKind): string {
  const found = CATALOG_KIND_OPTIONS.find((item) => item.id === kind);
  if (found) return found.title;
  switch (kind) {
    case "dishwasher":
      return "Посудомоечная машина";
    case "ac":
      return "Кондиционер";
    case "boiler":
      return "Бойлер";
    case "tv":
      return "Телевизор";
    case "heater":
      return "Обогреватель";
    default:
      return "Техника";
  }
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
