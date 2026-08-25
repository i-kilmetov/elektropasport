import { isCatalogApplianceKind } from "@/lib/appliance-catalog";
import {
  countIcecatCatalog,
  isIcecatCatalogSyncConfigured,
  listIcecatBrands,
} from "@/lib/icecat-catalog";

export async function GET(request: Request) {
  try {
    const kind = new URL(request.url).searchParams.get("kind")?.trim() ?? "";
    if (!isCatalogApplianceKind(kind)) {
      return Response.json({ error: "Некорректный тип техники" }, { status: 400 });
    }
    const brands = await listIcecatBrands(kind);
    const total = await countIcecatCatalog();
    return Response.json({
      brands,
      catalogReady: total > 0,
      syncConfigured: isIcecatCatalogSyncConfigured(),
      totalProducts: total,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/appliances/icecat/brands", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
