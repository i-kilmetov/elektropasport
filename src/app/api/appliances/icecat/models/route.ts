import { isCatalogApplianceKind } from "@/lib/appliance-catalog";
import { listIcecatModels } from "@/lib/icecat-catalog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind")?.trim() ?? "";
    const brand = searchParams.get("brand")?.trim() ?? "";
    if (!isCatalogApplianceKind(kind)) {
      return Response.json({ error: "Некорректный тип техники" }, { status: 400 });
    }
    if (!brand) {
      return Response.json({ error: "Укажите производителя" }, { status: 400 });
    }
    const models = await listIcecatModels(kind, brand);
    return Response.json({
      models: models.map((m) => ({
        id: m.id,
        brand: m.brand,
        productCode: m.productCode,
        modelName: m.modelName,
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/appliances/icecat/models", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
