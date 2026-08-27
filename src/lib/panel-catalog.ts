import {
  type CatalogCategory,
  type CatalogProduct,
  filterCatalogProducts,
  mergeCatalogWithIek,
  productMatchesCategory,
  productToDevice,
} from "@/lib/device-catalog";
import { DEVICE_DETAILS_CONFIDENCE } from "@/lib/manufacturer-brands";
import { ensureSchema } from "@/lib/db";
import { getSql } from "@/lib/sql-client";
import type { Device } from "@/types";

type CatalogRow = {
  id: string;
  source: string;
  article: string;
  name: string;
  brand: string;
  brand_key: string;
  category: string;
  series: string;
  model: string;
  modules: number;
  poles: string;
  rating: string;
  display_name: string;
  characteristics: unknown;
  image_png: string | null;
  image_jpg: string | null;
  category_p: string | null;
  group_p: string | null;
  subgroup_p: string | null;
};

function asCharacteristics(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string" && item.trim()) out[key] = item.trim();
  }
  return out;
}

export function rowToCatalogProduct(row: CatalogRow): CatalogProduct {
  return {
    id: row.id,
    article: row.article,
    name: row.name,
    brand: row.brand,
    brandKey: row.brand_key,
    category: row.category as CatalogCategory,
    series: row.series,
    model: row.model,
    modules: row.modules,
    poles: row.poles,
    rating: row.rating,
    displayName: row.display_name,
    characteristics: asCharacteristics(row.characteristics),
    imageUrl: row.image_png || row.image_jpg || undefined,
    imageJpg: row.image_jpg || undefined,
    categoryP: row.category_p || undefined,
    groupP: row.group_p || undefined,
    subgroupP: row.subgroup_p || undefined,
    source: row.source === "iek" ? "iek" : "seed",
  };
}

/** IEK infobase rows plus seed SKUs for other brands (same CatalogProduct shape). */
export async function listMergedCatalogProducts(
  category?: CatalogCategory,
): Promise<CatalogProduct[]> {
  const iek = await listIekCatalogProducts().catch(
    () => [] as CatalogProduct[],
  );
  const merged = mergeCatalogWithIek(iek);
  return category
    ? filterCatalogProducts(category, {}, merged)
    : merged;
}

export async function listIekCatalogProducts(
  category?: CatalogCategory,
): Promise<CatalogProduct[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (
    category
      ? await sql`
          SELECT *
          FROM panel_catalog_products
          WHERE source = 'iek'
            AND (
              category = ${category}
              OR (${category} = 'main_breaker' AND category IN ('breaker', 'main_breaker'))
            )
          ORDER BY series ASC, poles ASC, rating ASC, article ASC
          LIMIT 4000
        `
      : await sql`
          SELECT *
          FROM panel_catalog_products
          WHERE source = 'iek'
          ORDER BY series ASC, poles ASC, rating ASC, article ASC
          LIMIT 8000
        `
  ) as CatalogRow[];
  const products = rows.map(rowToCatalogProduct);
  return category
    ? products.filter((product) => productMatchesCategory(product, category))
    : products;
}

function norm(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[\s-]+/g, "");
}

function ratingKey(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/а\b/g, "a")
    .replace(/ма\b/g, "ma");
}

export function matchCatalogProduct(
  device: Pick<
    Device,
    "type" | "brandKey" | "manufacturer" | "series" | "poles" | "rating"
  >,
  products: CatalogProduct[],
): CatalogProduct | null {
  const brand = norm(device.brandKey || device.manufacturer);
  if (!brand.includes("iek") && !brand.includes("иэк") && !brand.includes("armat") && !brand.includes("karat") && !brand.includes("generica")) {
    return null;
  }
  const series = norm(device.series);
  if (!series) return null;
  const poles = (device.poles ?? "").toUpperCase();
  const rating = ratingKey(device.rating);
  const type = device.type === "main_breaker" ? "breaker" : device.type;

  const scored = products
    .filter((product) => {
      const category =
        product.category === "main_breaker" ? "breaker" : product.category;
      if (category !== type) return false;
      if (norm(product.series) !== series) return false;
      if (poles && product.poles.toUpperCase() !== poles) return false;
      return true;
    })
    .map((product) => {
      const productRating = ratingKey(product.rating);
      let score = 1;
      if (rating && productRating && (productRating === rating || productRating.includes(rating) || rating.includes(productRating))) {
        score += 3;
      }
      return { product, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.product ?? null;
}

export async function enrichDevicesFromPanelCatalog(
  devices: Device[],
): Promise<Device[]> {
  const needsMatch = devices.some(
    (device) =>
      (device.confidence ?? 0) >= DEVICE_DETAILS_CONFIDENCE &&
      !device.imageUrl &&
      (device.brandKey === "iek" ||
        /iek|иэк|armat|karat|generica/i.test(device.manufacturer ?? "")),
  );
  if (!needsMatch) return devices;

  const catalog = await listIekCatalogProducts().catch(() => [] as CatalogProduct[]);
  if (catalog.length === 0) return devices;

  return devices.map((device) => {
    if ((device.confidence ?? 0) < DEVICE_DETAILS_CONFIDENCE) return device;
    const match = matchCatalogProduct(device, catalog);
    if (!match) return device;
    return {
      ...productToDevice(match, {
        id: device.id,
        position: device.position ?? 0,
        status: device.status,
        confidence: device.confidence,
        circuitLabel: device.circuitLabel,
      }),
      type: device.type,
      name: device.circuitLabel?.trim() || device.name || match.displayName,
      rail: device.rail,
      powered: device.powered,
      stickerIcon: device.stickerIcon,
    };
  });
}
