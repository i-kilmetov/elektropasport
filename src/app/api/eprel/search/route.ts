import { isCatalogApplianceKind } from "@/lib/appliance-catalog";
import { searchEprelProduct, eprelPublicSearchUrl } from "@/lib/eprel";

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

    const publicUrl = eprelPublicSearchUrl(kind, brand, model);
    const result = await searchEprelProduct({ kind, brand, model });

    return Response.json({
      configured: result.configured,
      publicUrl,
      hit: result.hit,
      candidates: result.candidates,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/eprel/search", msg, error);
    return Response.json(
      { error: `EPREL: ${msg}`, configured: true, hit: null, candidates: [] },
      { status: 502 },
    );
  }
}
