import type { ApplianceManual, ApplianceSpec } from "@/types";

const ICECAT_API = "https://live.icecat.biz/api";

/** Known Open Icecat product — used to verify free-account access. */
const OPEN_PROBE = { brand: "HP", model: "RJ459AV", lang: "EN" } as const;

export type IcecatProductHit = {
  brand: string;
  model: string;
  title?: string;
  brandLogoUrl?: string;
  productImageUrl?: string;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  sourceUrl?: string;
};

export type IcecatLookupResult = {
  configured: boolean;
  hit: IcecatProductHit | null;
  status:
    | "not_configured"
    | "ok"
    | "not_found"
    | "full_only"
    | "auth_error"
    | "error";
  detail?: string;
  rawMessage?: string;
  rawCode?: number;
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

function contentToken(): string | null {
  return process.env.ICECAT_CONTENT_TOKEN?.trim() || null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/** Icecat often wraps labels in `{ Value, Language }` objects. */
function localizedString(value: unknown): string | undefined {
  const direct = asString(value);
  if (direct) return direct;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return asString(obj.Value) ?? asString(obj.value) ?? asString(obj.Name);
  }
  return undefined;
}

function brandLogoFromGeneral(general: Record<string, unknown>): string | undefined {
  const brandInfo = general.BrandInfo;
  if (!brandInfo || typeof brandInfo !== "object") return undefined;
  const logo = asString((brandInfo as Record<string, unknown>).BrandLogo);
  return logo ? normalizeIcecatAssetUrl(logo) : undefined;
}

function normalizeIcecatAssetUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://images.icecat.biz${url.startsWith("/") ? url : `/${url}`}`;
}

function productImageFromData(data: Record<string, unknown>): string | undefined {
  const image = data.Image;
  if (image && typeof image === "object") {
    const row = image as Record<string, unknown>;
    const url =
      asString(row.Pic500x500) ||
      asString(row.HighPic) ||
      asString(row.LowPic) ||
      asString(row.ThumbPic);
    if (url) return normalizeIcecatAssetUrl(url);
  }

  const gallery = data.Gallery;
  if (Array.isArray(gallery)) {
    for (const item of gallery) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const url =
        asString(row.Pic500x500) ||
        asString(row.HighPic) ||
        asString(row.LowPic) ||
        asString(row.ThumbPic);
      if (url) return normalizeIcecatAssetUrl(url);
    }
  }

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
  return asString(feature.RawValue) ?? null;
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
        const meta = nameObj as Record<string, unknown>;
        label =
          localizedString(meta.Name) ||
          localizedString(meta.Value) ||
          localizedString(meta.LocalName);
      }
      label =
        label ||
        localizedString(feature.Name) ||
        localizedString(feature.LocalName);
      const value = pickFeatureValue(feature);
      if (!label || !value || value.length > 120) continue;
      specs.push({ label, value });
      if (specs.length >= 20) return specs;
    }
  }
  return specs;
}

function manualsFromData(data: Record<string, unknown>): ApplianceManual[] {
  const manuals: ApplianceManual[] = [];
  const general = data.GeneralInfo;
  if (general && typeof general === "object") {
    const pdf = asString((general as Record<string, unknown>).ManualPDFURL);
    if (pdf) manuals.push({ title: "Руководство", url: pdf });
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
      manuals.push({
        title:
          asString(row.Description) ||
          asString(row.Type) ||
          "Документ производителя",
        url,
      });
      if (manuals.length >= 6) break;
    }
  }

  const seen = new Set<string>();
  return manuals.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

type IcecatPayload = {
  data?: Record<string, unknown>;
  msg?: string;
  Message?: string;
  Error?: string;
  Code?: number;
  StatusCode?: number;
};

function classifyPayload(
  httpStatus: number,
  payload: IcecatPayload | null,
  body: string,
): Pick<IcecatLookupResult, "status" | "detail" | "rawMessage" | "rawCode"> {
  const rawMessage =
    payload?.Message || payload?.Error || payload?.msg || body.slice(0, 200);
  const rawCode = payload?.StatusCode ?? payload?.Code;

  if (
    rawCode === 19 ||
    rawCode === 3 ||
    rawCode === 7 ||
    /api token|content.token|username|shopname|unknown.*user|unauthorized|not valid uuid/i.test(
      rawMessage,
    )
  ) {
    return {
      status: "auth_error",
      detail:
        "Токен или username не приняты Icecat. Для Open часто достаточно только ICECAT_USERNAME.",
      rawMessage,
      rawCode,
    };
  }

  if (
    rawCode === 9 ||
    /full icecat|app_key is required/i.test(rawMessage)
  ) {
    return {
      status: "full_only",
      detail: "Товар есть только в платном Full Icecat",
      rawMessage,
      rawCode,
    };
  }

  if (
    rawCode === 14 ||
    /brand restrictions|access is limited/i.test(rawMessage)
  ) {
    return {
      status: "full_only",
      detail: "Бренд ограничил раздачу (не Open)",
      rawMessage,
      rawCode,
    };
  }

  if (
    httpStatus === 404 ||
    rawCode === 4 ||
    rawCode === 8 ||
    rawCode === 15 ||
    rawCode === 17 ||
    /not present|not correct|not found|not yet released|missing information/i.test(
      rawMessage,
    )
  ) {
    return {
      status: "not_found",
      detail: "Модель не найдена в Open Icecat",
      rawMessage,
      rawCode,
    };
  }

  if (httpStatus >= 400) {
    return {
      status: "error",
      detail: `Icecat HTTP ${httpStatus}`,
      rawMessage,
      rawCode,
    };
  }

  return {
    status: "error",
    detail: "Неожиданный ответ Icecat",
    rawMessage,
    rawCode,
  };
}

function hitFromPayload(
  data: Record<string, unknown>,
  fallbackBrand: string,
  fallbackModel: string,
): IcecatProductHit | null {
  const general =
    data.GeneralInfo && typeof data.GeneralInfo === "object"
      ? (data.GeneralInfo as Record<string, unknown>)
      : data;

  const hitBrand =
    asString(general.Brand) ||
    asString(
      (general.BrandInfo as Record<string, unknown> | undefined)?.BrandName,
    ) ||
    fallbackBrand;
  const hitModel =
    asString(general.BrandPartCode) ||
    asString(general.ProductCode) ||
    asString(general.ProductName) ||
    fallbackModel;
  const title =
    asString(general.Title) ||
    asString(general.ProductName) ||
    `${hitBrand} ${hitModel}`;

  const specs = specsFromFeatures(data);
  const manuals = manualsFromData(data);
  const brandLogoUrl = brandLogoFromGeneral(general);
  const productImageUrl = productImageFromData(data);
  const iceCatId =
    asString(general.IcecatId) ||
    asString(data.IcecatId) ||
    asString(general.IcecatID);
  const sourceUrl = iceCatId
    ? `https://icecat.biz/ru/p/-/-/${encodeURIComponent(iceCatId)}.html`
    : `https://icecat.biz/search?query=${encodeURIComponent(`${hitBrand} ${hitModel}`)}`;

  if (!asString(general.Brand) && !asString(general.ProductName) && !specs.length) {
    return null;
  }

  if (!manuals.some((m) => m.url.includes("icecat"))) {
    manuals.push({ title: "Карточка товара", url: sourceUrl });
  }

  return {
    brand: hitBrand,
    model: hitModel,
    title,
    brandLogoUrl,
    productImageUrl,
    specs,
    manuals,
    sourceUrl,
  };
}

async function fetchIcecatOnce(options: {
  brand?: string;
  model?: string;
  icecatId?: string;
  lang: string;
  withTokens: boolean;
}): Promise<IcecatLookupResult> {
  const user = username();
  if (!user) return { configured: false, hit: null, status: "not_configured" };

  const params = new URLSearchParams({
    lang: options.lang,
    shopname: user,
    content: "",
  });

  if (options.icecatId) {
    params.set("icecat_id", options.icecatId);
  } else if (options.brand && options.model) {
    params.set("Brand", options.brand);
    params.set("ProductCode", options.model);
  } else {
    return { configured: true, hit: null, status: "not_found" };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.withTokens) {
    const token = apiToken();
    const cToken = contentToken();
    if (token) headers["api-token"] = token;
    if (cToken) headers["content-token"] = cToken;
  }

  let res: Response;
  try {
    res = await fetch(`${ICECAT_API}?${params.toString()}`, {
      headers,
      cache: "no-store",
    });
  } catch (error) {
    return {
      configured: true,
      hit: null,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const body = await res.text().catch(() => "");
  let payload: IcecatPayload | null = null;
  try {
    payload = body ? (JSON.parse(body) as IcecatPayload) : null;
  } catch {
    payload = null;
  }

  const data = payload?.data;
  const fallbackBrand = options.brand ?? "";
  const fallbackModel = options.model ?? options.icecatId ?? "";
  if (res.ok && data && typeof data === "object") {
    const hit = hitFromPayload(data, fallbackBrand, fallbackModel);
    if (hit) {
      return {
        configured: true,
        hit,
        status: "ok",
        rawMessage: payload?.Message,
        rawCode: payload?.StatusCode ?? payload?.Code,
      };
    }
  }

  return {
    configured: true,
    hit: null,
    ...classifyPayload(res.status, payload, body),
  };
}

/**
 * Open Icecat JSON lookup by brand + manufacturer product code.
 * Retries without tokens if token auth fails — Open catalog often needs only username.
 */
export async function searchIcecatProduct(options: {
  brand: string;
  model: string;
  lang?: string;
}): Promise<IcecatLookupResult> {
  const user = username();
  if (!user) return { configured: false, hit: null, status: "not_configured" };

  const brand = options.brand.trim();
  const model = options.model.trim().toUpperCase();
  if (!brand || !model) {
    return { configured: true, hit: null, status: "not_found" };
  }

  const lang = (options.lang || "EN").trim() || "EN";
  const hasTokens = Boolean(apiToken() || contentToken());

  const primary = await fetchIcecatOnce({
    brand,
    model,
    lang,
    withTokens: hasTokens,
  });
  if (primary.status === "ok") return primary;

  // Invalid/mismatched tokens often break Open lookups — retry username-only.
  if (hasTokens && primary.status === "auth_error") {
    const fallback = await fetchIcecatOnce({
      brand,
      model,
      lang,
      withTokens: false,
    });
    if (fallback.status === "ok") {
      return {
        ...fallback,
        detail:
          "Работает только с username (токены Icecat отклонены). Можно убрать ICECAT_API_TOKEN / ICECAT_CONTENT_TOKEN.",
      };
    }
    return {
      ...primary,
      detail:
        primary.detail ||
        "Токены не приняты, и username-only тоже не сработал",
    };
  }

  // RU locale sometimes empty while EN exists.
  if (primary.status === "not_found" && lang.toUpperCase() !== "EN") {
    const en = await fetchIcecatOnce({
      brand,
      model,
      lang: "EN",
      withTokens: hasTokens,
    });
    if (en.status === "ok") return en;
    if (hasTokens && en.status === "auth_error") {
      const enNoToken = await fetchIcecatOnce({
        brand,
        model,
        lang: "EN",
        withTokens: false,
      });
      if (enNoToken.status === "ok") return enNoToken;
    }
  }

  return primary;
}

export async function searchIcecatProductByIcecatId(options: {
  icecatId: string;
  lang?: string;
}): Promise<IcecatLookupResult> {
  const user = username();
  if (!user) return { configured: false, hit: null, status: "not_configured" };

  const icecatId = options.icecatId.trim().replace(/\D/g, "");
  if (!icecatId) {
    return { configured: true, hit: null, status: "not_found" };
  }

  const lang = (options.lang || "EN").trim() || "EN";
  const hasTokens = Boolean(apiToken() || contentToken());

  const primary = await fetchIcecatOnce({
    icecatId,
    lang,
    withTokens: hasTokens,
  });
  if (primary.status === "ok") return primary;

  if (hasTokens && primary.status === "auth_error") {
    const fallback = await fetchIcecatOnce({
      icecatId,
      lang,
      withTokens: false,
    });
    if (fallback.status === "ok") return fallback;
  }

  return primary;
}

/** Probe a known Open Icecat product to verify free-account access. */
export async function probeIcecatAccess(): Promise<{
  configured: boolean;
  ok: boolean;
  status: IcecatLookupResult["status"];
  detail?: string;
  rawMessage?: string;
  rawCode?: number;
  sampleTitle?: string;
  probeProduct: string;
}> {
  if (!isIcecatConfigured()) {
    return {
      configured: false,
      ok: false,
      status: "not_configured",
      detail: "ICECAT_USERNAME не задан",
      probeProduct: `${OPEN_PROBE.brand} ${OPEN_PROBE.model}`,
    };
  }
  const result = await searchIcecatProduct({
    brand: OPEN_PROBE.brand,
    model: OPEN_PROBE.model,
    lang: OPEN_PROBE.lang,
  });
  return {
    configured: true,
    ok: result.status === "ok" && Boolean(result.hit),
    status: result.status,
    detail: result.detail,
    rawMessage: result.rawMessage,
    rawCode: result.rawCode,
    sampleTitle: result.hit?.title,
    probeProduct: `${OPEN_PROBE.brand} ${OPEN_PROBE.model}`,
  };
}
