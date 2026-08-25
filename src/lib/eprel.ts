import type { ApplianceManual, ApplianceSpec } from "@/types";
import type { CatalogApplianceKind } from "@/lib/appliance-catalog-enrichment";

const EPREL_API_BASE = "https://eprel.ec.europa.eu/api";
const EPREL_WEB_BASE = "https://eprel.ec.europa.eu";

/** Public-site / API product group codes used by EPREL. */
export const EPREL_PRODUCT_GROUPS: Partial<
  Record<CatalogApplianceKind, string>
> = {
  washer: "washingmachines",
  dryer: "tumbledriers",
  dishwasher: "dishwashers",
  fridge: "refrigeratingappliances",
  oven: "ovens",
  ac: "airconditioners",
  boiler: "waterheaters",
  tv: "electronicdisplays",
  heater: "localspaceheaters",
  // microwave / hob — no reliable dedicated energy-label group for our use
};

export type EprelProductHit = {
  registrationNumber: string;
  productGroup: string;
  brand: string;
  model: string;
  energyClass?: string;
  detailUrl: string;
  labelUrl?: string;
  ficheUrl?: string;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
};

export function isEprelConfigured(): boolean {
  return Boolean(process.env.EPREL_API_KEY?.trim());
}

export function eprelPublicSearchUrl(
  kind: CatalogApplianceKind,
  brand: string,
  model: string,
): string | null {
  const group = EPREL_PRODUCT_GROUPS[kind];
  if (!group) return null;
  const params = new URLSearchParams();
  if (brand.trim()) params.set("supplierOrTrademark", brand.trim());
  if (model.trim()) params.set("modelIdentifier", model.trim());
  const qs = params.toString();
  return `${EPREL_WEB_BASE}/screen/product/${group}${qs ? `?${qs}` : ""}`;
}

export function eprelDetailUrl(
  productGroup: string,
  registrationNumber: string,
): string {
  return `${EPREL_WEB_BASE}/qr/${encodeURIComponent(registrationNumber)}`;
}

type EprelSearchRow = {
  registrationNumber?: string | number;
  modelIdentifier?: string;
  modelName?: string;
  trademark?: string;
  supplierOrTrademark?: string;
  energyClass?: string;
  energyClassEnergyEfficiency?: string;
  productGroup?: string;
};

type EprelDetail = EprelSearchRow & {
  energyLabel?: { url?: string };
  productInformationSheet?: { url?: string };
  energyLabelUrl?: string;
  productInformationSheetUrl?: string;
  technicalParameters?: Record<string, unknown>;
  [key: string]: unknown;
};

function apiKey(): string | null {
  return process.env.EPREL_API_KEY?.trim() || null;
}

async function eprelFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = apiKey();
  if (!key) {
    throw new Error("EPREL_API_KEY не задан");
  }
  const url = path.startsWith("http") ? path : `${EPREL_API_BASE}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "X-API-KEY": key,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function pickModel(row: EprelSearchRow): string {
  return (
    asString(row.modelIdentifier) ||
    asString(row.modelName) ||
    ""
  );
}

function pickBrand(row: EprelSearchRow): string {
  return (
    asString(row.trademark) ||
    asString(row.supplierOrTrademark) ||
    ""
  );
}

function pickEnergyClass(row: EprelSearchRow): string | undefined {
  return (
    asString(row.energyClass) ||
    asString(row.energyClassEnergyEfficiency)
  );
}

const SPEC_LABEL_RU: Record<string, string> = {
  energyClass: "Класс энергопотребления",
  energyEfficiencyClass: "Класс энергопотребления",
  ratedCapacity: "Загрузка",
  capacity: "Вместимость",
  volume: "Объём",
  totalVolume: "Общий объём",
  noise: "Уровень шума",
  airborneAcousticalNoiseEmission: "Уровень шума",
  powerConsumption: "Потребление энергии",
  annualEnergyConsumption: "Годовое энергопотребление",
  coolingCapacity: "Холодопроизводительность",
  heatingCapacity: "Теплопроизводительность",
  diagonal: "Диагональ",
  screenDiagonal: "Диагональ",
  waterConsumption: "Расход воды",
  spinningSpeed: "Отжим",
  maxSpinSpeed: "Отжим",
};

function humanizeKey(key: string): string {
  return (
    SPEC_LABEL_RU[key] ||
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatParamValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") {
    const s = String(value).trim();
    return s || null;
  }
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.value != null) {
      const unit = asString(obj.unit) || asString(obj.unitName) || "";
      return `${obj.value}${unit ? ` ${unit}` : ""}`.trim();
    }
  }
  return null;
}

function specsFromDetail(detail: EprelDetail): ApplianceSpec[] {
  const specs: ApplianceSpec[] = [];
  const energy = pickEnergyClass(detail);
  if (energy) {
    specs.push({ label: "Класс энергопотребления", value: energy });
  }

  const params = detail.technicalParameters;
  if (params && typeof params === "object") {
    for (const [key, raw] of Object.entries(params)) {
      if (/url|image|qr|guid|id$/i.test(key)) continue;
      const formatted = formatParamValue(raw);
      if (!formatted) continue;
      specs.push({ label: humanizeKey(key), value: formatted });
      if (specs.length >= 8) break;
    }
  }

  // Flat fields sometimes appear on the detail payload.
  for (const key of [
    "ratedCapacity",
    "totalVolume",
    "volume",
    "airborneAcousticalNoiseEmission",
    "annualEnergyConsumption",
    "coolingCapacity",
  ] as const) {
    if (specs.some((s) => s.label === humanizeKey(key))) continue;
    const formatted = formatParamValue(detail[key]);
    if (formatted) specs.push({ label: humanizeKey(key), value: formatted });
  }

  return specs;
}

function manualsFromDetail(
  detail: EprelDetail,
  productGroup: string,
  registrationNumber: string,
): ApplianceManual[] {
  const manuals: ApplianceManual[] = [
    {
      title: "Карточка EPREL (ЕС)",
      url: eprelDetailUrl(productGroup, registrationNumber),
    },
  ];
  const label =
    asString(detail.energyLabelUrl) ||
    asString(detail.energyLabel?.url) ||
    `${EPREL_API_BASE}/products/${encodeURIComponent(productGroup)}/${encodeURIComponent(registrationNumber)}/labels?language=EN`;
  const fiche =
    asString(detail.productInformationSheetUrl) ||
    asString(detail.productInformationSheet?.url) ||
    `${EPREL_API_BASE}/products/${encodeURIComponent(productGroup)}/${encodeURIComponent(registrationNumber)}/fiches?language=EN`;

  manuals.push({ title: "Энергоэтикетка ЕС", url: label });
  manuals.push({ title: "Product Fiche (лист ЕС)", url: fiche });
  return manuals;
}

function scoreHit(
  row: EprelSearchRow,
  brand: string,
  model: string,
): number {
  const b = pickBrand(row).toLowerCase();
  const m = pickModel(row).toLowerCase();
  const brandQ = brand.toLowerCase();
  const modelQ = model.toLowerCase().replace(/\s+/g, "");
  const modelNorm = m.replace(/\s+/g, "");
  let score = 0;
  if (b && brandQ && (b.includes(brandQ) || brandQ.includes(b))) score += 3;
  if (modelNorm === modelQ) score += 10;
  else if (modelNorm.includes(modelQ) || modelQ.includes(modelNorm)) score += 6;
  else if (modelNorm.slice(0, 6) && modelQ.startsWith(modelNorm.slice(0, 6)))
    score += 2;
  return score;
}

function toHit(
  row: EprelSearchRow,
  productGroup: string,
  detail?: EprelDetail | null,
): EprelProductHit | null {
  const registrationNumber = asString(row.registrationNumber);
  if (!registrationNumber) return null;
  const group = asString(row.productGroup) || productGroup;
  const merged: EprelDetail = { ...row, ...(detail ?? {}) };
  return {
    registrationNumber,
    productGroup: group,
    brand: pickBrand(row),
    model: pickModel(row),
    energyClass: pickEnergyClass(merged),
    detailUrl: eprelDetailUrl(group, registrationNumber),
    labelUrl: asString(merged.energyLabelUrl) || asString(merged.energyLabel?.url),
    ficheUrl:
      asString(merged.productInformationSheetUrl) ||
      asString(merged.productInformationSheet?.url),
    specs: specsFromDetail(merged),
    manuals: manualsFromDetail(merged, group, registrationNumber),
  };
}

/**
 * Search EPREL for a brand/model within the product group for our appliance kind.
 * Requires EPREL_API_KEY. Returns null when not configured.
 */
export async function searchEprelProduct(options: {
  kind: CatalogApplianceKind;
  brand: string;
  model: string;
}): Promise<{
  configured: boolean;
  hit: EprelProductHit | null;
  candidates: EprelProductHit[];
}> {
  if (!apiKey()) {
    return { configured: false, hit: null, candidates: [] };
  }

  const productGroup = EPREL_PRODUCT_GROUPS[options.kind];
  if (!productGroup || options.kind === "microwave" || options.kind === "hob") {
    return { configured: true, hit: null, candidates: [] };
  }

  const params = new URLSearchParams({
    page: "0",
    size: "15",
  });
  if (options.brand.trim()) {
    params.set("supplierOrTrademark", options.brand.trim());
  }
  if (options.model.trim()) {
    params.set("modelIdentifier", options.model.trim());
  }

  const res = await eprelFetch(
    `/products/${encodeURIComponent(productGroup)}?${params.toString()}`,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `EPREL search failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const data = (await res.json()) as {
    content?: EprelSearchRow[];
    products?: EprelSearchRow[];
  };
  const rows = Array.isArray(data.content)
    ? data.content
    : Array.isArray(data.products)
      ? data.products
      : [];

  const ranked = [...rows]
    .map((row) => ({ row, score: scoreHit(row, options.brand, options.model) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const candidates: EprelProductHit[] = [];
  for (const item of ranked.slice(0, 5)) {
    const hit = toHit(item.row, productGroup);
    if (hit) candidates.push(hit);
  }

  const best = ranked[0];
  if (!best || best.score < 5) {
    return { configured: true, hit: null, candidates };
  }

  const registrationNumber = asString(best.row.registrationNumber);
  let detail: EprelDetail | null = null;
  if (registrationNumber) {
    try {
      const detailRes = await eprelFetch(
        `/products/${encodeURIComponent(productGroup)}/${encodeURIComponent(registrationNumber)}`,
      );
      if (detailRes.ok) {
        detail = (await detailRes.json()) as EprelDetail;
      }
    } catch {
      detail = null;
    }
  }

  return {
    configured: true,
    hit: toHit(best.row, productGroup, detail),
    candidates,
  };
}
