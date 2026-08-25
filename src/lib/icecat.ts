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

export type IcecatLookupResult = {
  configured: boolean;
  hit: IcecatProductHit | null;
  /** Machine-readable status for diagnostics in the UI / status API. */
  status:
    | "not_configured"
    | "ok"
    | "not_found"
    | "full_only"
    | "auth_error"
    | "error";
  detail?: string;
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
    if (pdf) manuals.push({ title: "Руководство (Icecat)", url: pdf });
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

function classifyIcecatFailure(
  status: number,
  body: string,
): Pick<IcecatLookupResult, "status" | "detail"> {
  const lower = body.toLowerCase();
  if (
    status === 401 ||
    /unknown.*user|username|shopname|mandatory|authentication|unauthorized/i.test(
      body,
    )
  ) {
    return {
      status: "auth_error",
      detail: "Проверьте ICECAT_USERNAME / токены в Vercel",
    };
  }
  if (
    /full icecat/i.test(body) ||
    (status === 403 && /app_key|full icecat content/i.test(body))
  ) {
    return {
      status: "full_only",
      detail: "Модель есть только в платном Full Icecat",
    };
  }
  if (
    status === 404 ||
    status === 400 ||
    /not correct|not found|identifier/i.test(lower)
  ) {
    return {
      status: "not_found",
      detail: "Модель не найдена в Open Icecat",
    };
  }
  return {
    status: "error",
    detail: `Icecat HTTP ${status}: ${body.slice(0, 160)}`,
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
    manuals.push({ title: "Карточка Icecat", url: sourceUrl });
  }

  return {
    brand: hitBrand,
    model: hitModel,
    title,
    specs,
    manuals,
    sourceUrl,
  };
}

/**
 * Open Icecat JSON lookup by brand + manufacturer product code.
 * Free worldwide after registering at https://icecat.biz/registration
 */
export async function searchIcecatProduct(options: {
  brand: string;
  model: string;
  lang?: string;
}): Promise<IcecatLookupResult> {
  const user = username();
  if (!user) return { configured: false, hit: null, status: "not_configured" };

  const brand = options.brand.trim();
  // Icecat product codes are uppercase.
  const model = options.model.trim().toUpperCase();
  if (!brand || !model) {
    return { configured: true, hit: null, status: "not_found" };
  }

  const lang = (options.lang || "RU").trim() || "RU";
  // Empty `content` returns the full Open datasheet.
  const params = new URLSearchParams({
    lang,
    shopname: user,
    username: user,
    Brand: brand,
    ProductCode: model,
    content: "",
  });

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = apiToken();
  const cToken = contentToken();
  if (token) headers["api-token"] = token;
  if (cToken) headers["content-token"] = cToken;

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
  type IcecatPayload = {
    data?: Record<string, unknown>;
    msg?: string;
    Message?: string;
    Error?: string;
    Code?: number;
    StatusCode?: number;
  };
  let payload: IcecatPayload | null = null;
  try {
    payload = body ? (JSON.parse(body) as IcecatPayload) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const classified = classifyIcecatFailure(res.status, body);
    return { configured: true, hit: null, ...classified };
  }

  // Some Icecat errors still return HTTP 200 with StatusCode/Code.
  const code = payload?.StatusCode ?? payload?.Code;
  if (typeof code === "number" && code !== 0 && !payload?.data) {
    if (code === 4) {
      return {
        configured: true,
        hit: null,
        status: "not_found",
        detail:
          payload?.Message ||
          payload?.Error ||
          "Product identifier not correct",
      };
    }
    if (code === 3 || code === 7) {
      return {
        configured: true,
        hit: null,
        status: "auth_error",
        detail:
          payload?.Message ||
          payload?.Error ||
          "Icecat user/token mismatch",
      };
    }
  }

  const data = payload?.data;
  if (!data || typeof data !== "object") {
    return {
      configured: true,
      hit: null,
      status: "not_found",
      detail: payload?.Message || payload?.Error || "Пустой ответ Icecat",
    };
  }

  const hit = hitFromPayload(data, brand, model);
  if (!hit) {
    return {
      configured: true,
      hit: null,
      status: "not_found",
      detail: "Ответ без карточки продукта",
    };
  }

  return { configured: true, hit, status: "ok" };
}

/** Probe a known Open Icecat demo product to verify account access. */
export async function probeIcecatAccess(): Promise<{
  configured: boolean;
  ok: boolean;
  status: IcecatLookupResult["status"];
  detail?: string;
  sampleTitle?: string;
}> {
  if (!isIcecatConfigured()) {
    return {
      configured: false,
      ok: false,
      status: "not_configured",
      detail: "ICECAT_USERNAME не задан",
    };
  }
  const result = await searchIcecatProduct({
    brand: "HP",
    model: "F0Y97EA",
    lang: "EN",
  });
  return {
    configured: true,
    ok: result.status === "ok" && Boolean(result.hit),
    status: result.status,
    detail: result.detail,
    sampleTitle: result.hit?.title,
  };
}
