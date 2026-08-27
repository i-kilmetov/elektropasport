import {
  type CatalogCategory,
  deviceCatalog,
  filterCatalogProducts,
} from "@/lib/device-catalog";
import { listMergedCatalogProducts } from "@/lib/panel-catalog";

const CATEGORIES: CatalogCategory[] = [
  "breaker",
  "main_breaker",
  "rcd",
  "diff_breaker",
  "voltage_relay",
  "spd",
  "afdd",
];

export async function GET(request: Request) {
  try {
    const category = new URL(request.url).searchParams.get("category")?.trim();
    const parsed = CATEGORIES.includes(category as CatalogCategory)
      ? (category as CatalogCategory)
      : undefined;
    const products = await listMergedCatalogProducts(parsed);
    const iekCount = products.filter((product) => product.source === "iek")
      .length;
    return Response.json({
      source: iekCount > 0 ? "iek+seed" : "seed",
      products,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/catalog/products", msg, error);
    const category = new URL(request.url).searchParams.get("category")?.trim();
    const parsed = CATEGORIES.includes(category as CatalogCategory)
      ? (category as CatalogCategory)
      : undefined;
    return Response.json({
      error: msg,
      source: "seed",
      products: parsed
        ? filterCatalogProducts(parsed, {}, deviceCatalog)
        : deviceCatalog,
    });
  }
}
