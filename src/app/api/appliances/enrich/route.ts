import { isCatalogApplianceKind } from "@/lib/appliance-catalog";
import { enrichApplianceProduct } from "@/lib/appliance-product-lookup";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind")?.trim() ?? "";
    const brand = searchParams.get("brand")?.trim() ?? "";
    const model = searchParams.get("model")?.trim() ?? "";

    if (!isCatalogApplianceKind(kind)) {
      return Response.json({ error: "Некорректный тип техники" }, { status: 400 });
    }
    if (!brand || !model) {
      return Response.json(
        { error: "Укажите производителя и модель" },
        { status: 400 },
      );
    }

    const result = await enrichApplianceProduct({ kind, brand, model });
    return Response.json({
      configured: result.configured,
      provider: result.provider,
      publicUrl: result.publicUrl,
      hit: result.matched
        ? {
            energyClass: result.energyClass,
            specs: result.specs,
            manuals: result.manuals,
          }
        : null,
      candidates: [],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/appliances/enrich", msg, error);
    return Response.json(
      {
        error: msg,
        configured: true,
        provider: null,
        hit: null,
        candidates: [],
      },
      { status: 502 },
    );
  }
}
