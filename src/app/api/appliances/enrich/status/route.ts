import { enrichApplianceProduct } from "@/lib/appliance-product-lookup";
import { probeIcecatAccess, isIcecatConfigured } from "@/lib/icecat";
import { isEprelConfigured } from "@/lib/eprel";

/**
 * Quick health check for free Open Icecat access.
 * Uses the well-known Open demo product HP / F0Y97EA.
 */
export async function GET() {
  try {
    const probe = await probeIcecatAccess();
    // Also run one enrichment path for a catalog washer model.
    const sample = await enrichApplianceProduct({
      kind: "washer",
      brand: "Bosch",
      model: "WAN28290",
    });

    return Response.json({
      icecat: {
        configured: isIcecatConfigured(),
        ...probe,
        meaning:
          probe.ok
            ? "Open Icecat отвечает — бесплатный доступ к Open-каталогу работает"
            : probe.status === "not_configured"
              ? "Добавьте ICECAT_USERNAME (и желательно ICECAT_API_TOKEN) в Vercel"
              : probe.status === "auth_error"
                ? "Логин/токен не приняты Icecat — проверьте username и Access tokens"
                : probe.status === "full_only"
                  ? "Аккаунт видит Full-only контент как платный; для Open нужен другой товар"
                  : probe.status === "not_found"
                    ? "Демо-товар не найден — обычно это ошибка username/токена или ещё не активирован аккаунт"
                    : "Ошибка запроса к Icecat — см. detail",
      },
      eprelConfigured: isEprelConfigured(),
      sampleEnrich: {
        provider: sample.provider,
        matched: sample.matched,
        specs: sample.specs.length,
        manuals: sample.manuals.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/appliances/enrich/status", msg, error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
