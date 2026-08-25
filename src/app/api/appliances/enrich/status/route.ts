import { enrichApplianceProduct } from "@/lib/appliance-product-lookup";
import { probeIcecatAccess, isIcecatConfigured } from "@/lib/icecat";
import { isEprelConfigured } from "@/lib/eprel";

/**
 * Quick health check for free Open Icecat access.
 * Probes HP / RJ459AV (known Open datasheet).
 */
export async function GET() {
  try {
    const probe = await probeIcecatAccess();
    const sample = await enrichApplianceProduct({
      kind: "washer",
      brand: "Bosch",
      model: "WAN28290",
    });

    return Response.json({
      icecat: {
        usernameConfigured: isIcecatConfigured(),
        probeOk: probe.ok,
        status: probe.status,
        detail: probe.detail,
        rawMessage: probe.rawMessage ?? null,
        rawCode: probe.rawCode ?? null,
        sampleTitle: probe.sampleTitle ?? null,
        probeProduct: probe.probeProduct,
        meaning: probe.ok
          ? "Open Icecat работает. Username (и при необходимости токены) в порядке."
          : probe.status === "not_configured"
            ? "Добавьте ICECAT_USERNAME в Vercel"
            : probe.status === "auth_error"
              ? "Icecat отверг токен/username. Попробуйте оставить только ICECAT_USERNAME (без API/Content tokens) и сделать Redeploy."
              : probe.status === "full_only"
                ? "Доступ к Open есть, но этот товар только в платном Full Icecat"
                : probe.status === "not_found"
                  ? "Open-товар-проба не найден для вашего аккаунта — смотрите rawMessage"
                  : "Ошибка Icecat — смотрите rawMessage",
        note: "Бесплатный Open Icecat покрывает в основном IT/CE спонсорские бренды. Многие бытовые модели Bosch/LG/Samsung — Full Icecat (платно).",
      },
      eprelConfigured: isEprelConfigured(),
      sampleEnrich: {
        brandModel: "Bosch WAN28290",
        provider: sample.provider,
        matched: sample.matched,
        icecatStatus: sample.icecatStatus,
        icecatDetail: sample.icecatDetail,
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
