import type { ApplianceManual, ApplianceSpec } from "@/types";

const ICECAT_API = "https://live.icecat.biz/api";

export type IcecatProductHit = {
  brand: string;
  model: string;
  title?: string;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  sourceUrl?: string;
};

export function isIcecatConfigured(): boolean {
  return Boolean(process.env.ICECAT_USERNAME?.trim());
}

function username(): string | null {
  return process.env.ICECAT_USERNAME?.trim() || null;
}

function apiToken(): string | null {
  return process.env.ICECAT_API_TOKEN?.trim() || null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function pickFeatureValue(feature: Record<string, unknown>): string | null {
  const present = feature.PresentationValue ?? feature.Value;
  if (typeof present === "string" && present.trim()) return present.trim();
  if (typeof present === "number") return String(present);
  if (present && typeof present === "object") {
    const obj = present as Record<string, unknown>;
    const v = asString(obj.Value) ?? asString(obj.value);
    if (v) return v;
  }
  const raw = asString(feature.RawValue);
  return raw ?? null;
}

function specsFromFeatures(data: Record<string, unknown>): ApplianceSpec[] {
  const groups = data.FeaturesGroups;
  if (!Array.isArray(groups)) return [];
  const specs: ApplianceSpec[] = [];
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const features = (group as { Features?: unknown }).Features;
    if (!Array.isArray(features)) continue;
    for (const item of features) {
      if (!item || typeof item !== "object") continue;
      const feature = item as Record<string, unknown>;
      const nameObj = feature.Feature;
      let label: string | undefined;
      if (nameObj && typeof nameObj === "object") {
        label =
          asString((nameObj as Record<string, unknown>).Name) ||
          asString((nameObj as Record<string, unknown>).Value);
      }
      label = label || asString(feature.Name) || asString(feature.LocalName);
      const value = pickFeatureValue(feature);
      if (!label || !value) continue;
      // Skip huge marketing blobs
      if (value.length > 120) continue;
      specs.push({ label, value });
      if (specs.length >= 10) return specs;
    }
  }
  return specs;
}

function manualsFromData(data: Record<string, unknown>): ApplianceManual[] {
  const manuals: ApplianceManual[] = [];
  const general = data.GeneralInfo;
  if (general && typeof general === "object") {
    const pdf = asString((general as Record<string, unknown>).ManualPDFURL);
    if (pdf) {
      manuals.push({ title: "Руководство (Icecat)", url: pdf });
    }
  }

  const multimedia = data.Multimedia;
  if (Array.isArray(multimedia)) {
    for (const item of multimedia) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const type = (asString(row.Type) || asString(row.type) || "").toLowerCase();
      const url =
        asString(row.URL) ||
        asString(row.Url) ||
        asString(row.ContentURL) ||
        asString(row.PdfUrl);
      if (!url) continue;
      const isManual =
        type.includes("manual") ||
        type.includes("leaflet") ||
        type.includes("pdf") ||
        type.includes("fiche");
      if (!isManual) continue;
      const title =
        asString(row.Description) ||
        asString(row.Type) ||
        "Документ производителя";
      manuals.push({ title, url });
      if (manuals.length >= 6) break;
    }
  }

  // Dedupe by URL
  const seen = new Set<string>();
  return manuals.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * Open Icecat JSON lookup by brand + manufacturer product code.
 * Free worldwide after registering at https://icecat.biz/registration
 * (Open Icecat — not EU-only). Coverage is limited to sponsoring brands.
 */
export async function searchIcecatProduct(options: {
  brand: string;
  model: string;
  lang?: string;
}): Promise<{
  configured: boolean;
  hit: IcecatProductHit | null;
}> {
  const user = username();
  if (!user) return { configured: false, hit: null };

  const brand = options.brand.trim();
  const model = options.model.trim();
  if (!brand || !model) return { configured: true, hit: null };

  const lang = (options.lang || "ru").trim() || "ru";
  const params = new URLSearchParams({
    lang,
    shopname: user,
    Brand: brand,
    ProductCode: model,
    content: "essentialinfo,featuregroups,manuals,generalinfo,multimedia",
  });

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = apiToken();
  if (token) headers["api-token"] = token;

  const res = await fetch(`${ICECAT_API}?${params.toString()}`, {
    headers,
    cache: "no-store",
  });

  if (res.status === 404) return { configured: true, hit: null };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Unknown product / not in Open catalog
    if (res.status === 400 || res.status === 403) {
      // 403 often means product is Full Icecat only — treat as miss.
      if (/not found|identifier|Full Icecat|forbidden/i.test(body)) {
        return { configured: true, hit: null };
      }
    }
    throw new Error(
      `Icecat lookup failed (${res.status})${body ? `: ${body.slice(0, 180)}` : ""}`,
    );
  }

  const payload = (await res.json()) as {
    data?: Record<string, unknown>;
    msg?: string;
    Message?: string;
  };
  const data = payload.data;
  if (!data || typeof data !== "object") {
    return { configured: true, hit: null };
  }

  const general =
    data.GeneralInfo && typeof data.GeneralInfo === "object"
      ? (data.GeneralInfo as Record<string, unknown>)
      : data;

  const hitBrand =
    asString(general.Brand) ||
    asString((general.BrandInfo as Record<string, unknown> | undefined)?.BrandName) ||
    brand;
  const hitModel =
    asString(general.BrandPartCode) ||
    asString(general.ProductCode) ||
    asString(general.ProductName) ||
    model;
  const title =
    asString(general.Title) ||
    asString(general.ProductName) ||
    `${hitBrand} ${hitModel}`;

  const specs = specsFromFeatures(data);
  const manuals = manualsFromData(data);
  const iceCatId = asString(general.IcecatId) || asString(data.IcecatId);
  const sourceUrl = iceCatId
    ? `https://icecat.biz/ru/p/-/-/${encodeURIComponent(iceCatId)}.html`
    : `https://icecat.biz/search?query=${encodeURIComponent(`${hitBrand} ${hitModel}`)}`;

  if (!specs.length && !manuals.length && !title) {
    return { configured: true, hit: null };
  }

  if (sourceUrl && !manuals.some((m) => m.url.includes("icecat"))) {
    manuals.push({ title: "Карточка Icecat", url: sourceUrl });
  }

  return {
    configured: true,
    hit: {
      brand: hitBrand,
      model: hitModel,
      title,
      specs,
      manuals,
      sourceUrl,
    },
  };
}
