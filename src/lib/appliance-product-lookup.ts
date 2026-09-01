import type { CatalogApplianceKind } from "@/lib/appliance-catalog-enrichment";
import { buildEprelPublicUrl } from "@/lib/appliance-catalog-enrichment";
import { ICECAT_APPLIANCE_LANG, searchIcecatProduct } from "@/lib/icecat";
import { isEprelConfigured, searchEprelProduct } from "@/lib/eprel";
import type { ApplianceManual, ApplianceSpec } from "@/types";

export type ApplianceEnrichmentResult = {
  /** True when at least one live provider is configured (Icecat and/or EPREL). */
  configured: boolean;
  provider: "icecat" | "eprel" | null;
  matched: boolean;
  publicUrl: string | null;
  energyClass?: string;
  brandLogoUrl?: string;
  productImageUrl?: string;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  icecatStatus?: string;
  icecatDetail?: string;
};

/**
 * Free-first enrichment:
 * 1) Open Icecat (worldwide free account) — specs + PDF manuals
 * 2) EPREL API only if EPREL_API_KEY is set (unlikely for RU service)
 * 3) Otherwise public EPREL web link (no key) when product group exists
 */
export async function enrichApplianceProduct(options: {
  kind: CatalogApplianceKind;
  brand: string;
  model: string;
}): Promise<ApplianceEnrichmentResult> {
  const publicUrl = buildEprelPublicUrl(
    options.kind,
    options.brand,
    options.model,
  );

  const icecat = await searchIcecatProduct({
    brand: options.brand,
    model: options.model,
    lang: ICECAT_APPLIANCE_LANG,
  });

  if (icecat.hit) {
    return {
      configured: true,
      provider: "icecat",
      matched: true,
      publicUrl: icecat.hit.sourceUrl ?? publicUrl,
      brandLogoUrl: icecat.hit.brandLogoUrl,
      productImageUrl: icecat.hit.productImageUrl,
      specs: icecat.hit.specs,
      manuals: icecat.hit.manuals,
      icecatStatus: icecat.status,
      icecatDetail: icecat.detail,
    };
  }

  if (isEprelConfigured()) {
    const eprel = await searchEprelProduct({
      kind: options.kind,
      brand: options.brand,
      model: options.model,
    });
    if (eprel.hit) {
      return {
        configured: true,
        provider: "eprel",
        matched: true,
        publicUrl: eprel.hit.detailUrl || publicUrl,
        energyClass: eprel.hit.energyClass,
        specs: eprel.hit.specs,
        manuals: eprel.hit.manuals,
        icecatStatus: icecat.status,
        icecatDetail: icecat.detail,
      };
    }
  }

  return {
    configured: icecat.configured || isEprelConfigured(),
    provider: null,
    matched: false,
    publicUrl,
    specs: [],
    manuals: [],
    icecatStatus: icecat.status,
    icecatDetail: icecat.detail,
  };
}
