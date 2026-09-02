import type { CatalogApplianceKind } from "@/lib/appliance-catalog";
import type { BarcodeLookupResponse } from "@/lib/appliance-barcode";
import { extractPowerWattsFromSpecs, icecatStatusMessage } from "@/lib/appliance-specs";
import {
  getIcecatCatalogProduct,
  resolveApplianceKindFromIcecatCategory,
} from "@/lib/icecat-catalog";
import {
  normalizeGtin,
  searchIcecatProductByGtin,
} from "@/lib/icecat";

export type { BarcodeLookupResponse };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("gtin")?.trim() ?? "";
    const gtin = normalizeGtin(raw);
    if (!gtin) {
      return Response.json(
        { error: "Введите корректный штрихкод (EAN/UPC, 8–14 цифр)" },
        { status: 400 },
      );
    }

    const result = await searchIcecatProductByGtin({ gtin });
    if (!result.configured) {
      return Response.json(
        { error: "Каталог Icecat не настроен" },
        { status: 503 },
      );
    }
    if (!result.hit) {
      const message =
        icecatStatusMessage(result.status, result.detail) ||
        "Товар по этому штрихкоду не найден";
      return Response.json(
        {
          error: message,
          status: result.status,
          statusDetail: result.detail ?? null,
        },
        { status: result.status === "full_only" ? 403 : 404 },
      );
    }

    const hit = result.hit;
    const icecatId = hit.icecatId?.replace(/\D/g, "") || "";
    const catalogRow = icecatId
      ? await getIcecatCatalogProduct(icecatId)
      : null;

    const kindFromCatalog = catalogRow?.kind ?? null;
    const kindFromCategory = resolveApplianceKindFromIcecatCategory(
      hit.categoryName,
    );
    const kind = kindFromCatalog ?? kindFromCategory;
    const kindMatched = Boolean(kind);

    const productCode = hit.model;
    const modelName =
      hit.title && hit.title !== `${hit.brand} ${hit.model}`
        ? hit.title
        : hit.model;

    const payload: BarcodeLookupResponse = {
      gtin,
      kind,
      kindMatched,
      product: {
        id: icecatId || gtin,
        brand: hit.brand,
        productCode,
        modelName,
      },
      powerW: extractPowerWattsFromSpecs(hit.specs) ?? null,
      specs: hit.specs,
      manuals: hit.manuals,
      title: hit.title ?? null,
      brandLogoUrl: hit.brandLogoUrl ?? null,
      productImageUrl: hit.productImageUrl ?? null,
      categoryName: hit.categoryName ?? null,
      status: result.status,
      statusDetail: result.detail ?? null,
    };

    return Response.json(payload);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/appliances/icecat/barcode", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
