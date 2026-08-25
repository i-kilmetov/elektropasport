import {
  getIcecatCatalogProduct,
  loadIcecatProductDetails,
} from "@/lib/icecat-catalog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return Response.json({ error: "Укажите id модели Icecat" }, { status: 400 });
    }
    const product = await getIcecatCatalogProduct(id);
    if (!product) {
      return Response.json({ error: "Модель не найдена в каталоге" }, { status: 404 });
    }
    const details = await loadIcecatProductDetails({
      brand: product.brand,
      productCode: product.productCode,
    });
    return Response.json({
      product: {
        id: product.id,
        kind: product.kind,
        brand: product.brand,
        productCode: product.productCode,
        modelName: product.modelName,
      },
      powerW: details.powerW ?? null,
      specs: details.specs,
      manuals: details.manuals,
      title: details.title ?? null,
      matched: details.matched,
      status: details.status,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/appliances/icecat/product", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
