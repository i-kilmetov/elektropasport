import type { CatalogCategory, CatalogProduct } from "@/lib/device-catalog";
import { polesToModules } from "@/lib/device-catalog";
import { ensureSchema } from "@/lib/db";
import { getSql } from "@/lib/sql-client";

/** Public IEK infobase dump: Article, Name, groups, Image png/jpg. */
export const IEK_IMAGES_XML_URL =
  "https://www.iek.ru/local/cron/xmlapi/imagesPrice.xml";

const USER_AGENT = "TokomPanelCatalog/1.0 (+https://tokom.ru)";
const BATCH_SIZE = 150;

const SKIP_RE =
  /дополнительн|расцепител|независим|контактор|рубильник|разъедин|разъед\.|шина\b|клемм|корпус|бокс|щит[аы]?\b|лампа|индикатор|кнопк|счетчик|счётчик|трансформатор|кабел.?канал|лоток|сальник|замок|изолятор|вентилятор/i;

const SERIES_RE =
  /(ВА\s?47-?\s?\d+|ВА\s?88-?\s?\d+|ВД\s?1-?\s?\d+|ВД\s?3-?\s?\d+|АВДТ\s?-?\s?\d+|ОПС\s?1(?:-[A-Z0-9]+)?|АФДД|УЗДП|РН-?\s?\d+|УЗМ-?[\w.-]*|M06N|M10N|M09N)/i;

const POLES_RE = /\b(1P\+N|3P\+N|1P|2P|3P|4P)\b/i;

type XmlFields = {
  article: string;
  name: string;
  categoryP: string;
  groupP: string;
  subgroupP: string;
  png: string;
  jpg: string;
};

/** imgproxy URLs are signed and rotate; persist the original CDN media URL. */
export function unwrapIekImageUrl(url: string): string {
  if (!url) return url;
  const match = url.match(
    /\/imgproxy\/[^/]+\/([A-Za-z0-9+/=_-]+)(?:\.[a-z0-9]+)?$/i,
  );
  if (!match?.[1]) return url;
  try {
    const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch {
    /* keep proxy URL */
  }
  return url;
}

export function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function xmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return decodeXmlText(match?.[1] ?? "");
}

export function parseIekProductXml(xml: string): XmlFields | null {
  const article = xmlTag(xml, "Article");
  const name = xmlTag(xml, "Name");
  if (!article || !name) return null;
  return {
    article,
    name,
    categoryP: xmlTag(xml, "CategoryP"),
    groupP: xmlTag(xml, "GroupP"),
    subgroupP: xmlTag(xml, "SubgroupP"),
    png: unwrapIekImageUrl(xmlTag(xml, "png")),
    jpg: unwrapIekImageUrl(xmlTag(xml, "jpg")),
  };
}

function inScope(fields: XmlFields): boolean {
  const blob = `${fields.categoryP} ${fields.groupP} ${fields.subgroupP}`;
  return (
    /(?:^|\s)01\./.test(blob) ||
    /(?:^|\s)60\.01/.test(blob) ||
    /(?:^|\s)41\.01/.test(blob) ||
    /(?:^|\s)30\.04/.test(blob) ||
    /модульн/i.test(blob)
  );
}

export function classifyIekDevice(haystack: string): CatalogCategory | null {
  const text = haystack.toLowerCase();
  if (SKIP_RE.test(text)) return null;
  if (/афдд|уздп|дугов/.test(text)) return "afdd";
  if (/узип|опс1|ограничитель импульс|перенапряж/.test(text)) return "spd";
  if (/реле напряжения|реле контроля напряжения|\bрн-/.test(text)) {
    return "voltage_relay";
  }
  if (/авдт|диф(?:ференциальн(?:ый|ого))? автомат/.test(text)) {
    return "diff_breaker";
  }
  if (
    (/\bузо\b|выключатель дифференциальн|\bвд1|\bвд3/.test(text)) &&
    !/авдт/.test(text)
  ) {
    return "rcd";
  }
  if (
    /автоматическ\w* выключатель|\bва47|\bва88|\bm06n|\bm10n|\bm09n/.test(text)
  ) {
    return "breaker";
  }
  return null;
}

function normalizeSeries(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/АВДТ-/, "АВДТ").replace(/ОПС1-/i, "ОПС1-");
}

export function parseIekName(name: string): {
  series?: string;
  poles?: string;
  curve?: string;
  amps?: string;
  leakMa?: string;
  breakingKa?: string;
} {
  const poles = name.match(POLES_RE)?.[1]?.toUpperCase().replace("1P+N", "1P+N");
  const seriesRaw = name.match(SERIES_RE)?.[1];
  const curveAmp = name.match(/\b([BCD])\s*(\d+(?:[.,]\d+)?)\s*А?\b/i);
  const ampsOnly = name.match(/(\d+(?:[.,]\d+)?)\s*А\b/i);
  const leak = name.match(/(\d+)\s*мА\b/i);
  const ka = name.match(/(\d+(?:[.,]\d+)?)\s*кА\b/i);
  return {
    series: seriesRaw ? normalizeSeries(seriesRaw) : undefined,
    poles: poles ? poles.replace("3P+N", "3P+N") : undefined,
    curve: curveAmp?.[1]?.toUpperCase(),
    amps: (curveAmp?.[2] ?? ampsOnly?.[1])?.replace(",", "."),
    leakMa: leak?.[1],
    breakingKa: ka?.[1]?.replace(",", "."),
  };
}

function displayNameFor(
  category: CatalogCategory,
  poles: string,
  rating: string,
): string {
  switch (category) {
    case "rcd":
      return `УЗО ${poles} ${rating}`.trim();
    case "diff_breaker":
      return `Дифавтомат ${poles} ${rating}`.trim();
    case "voltage_relay":
      return `Реле напряжения ${rating}`.trim();
    case "spd":
      return `УЗИП ${rating || poles}`.trim();
    case "afdd":
      return `УЗДП ${poles} ${rating}`.trim();
    default:
      return `Автомат ${poles} ${rating}`.trim();
  }
}

function brandFromName(name: string): { brand: string; brandKey: string } {
  if (/generica/i.test(name)) return { brand: "GENERICA", brandKey: "iek" };
  if (/armat/i.test(name)) return { brand: "IEK ARMAT", brandKey: "iek" };
  if (/karat/i.test(name)) return { brand: "IEK KARAT", brandKey: "iek" };
  return { brand: "IEK", brandKey: "iek" };
}

export function iekFieldsToCatalogProduct(
  fields: XmlFields,
): CatalogProduct | null {
  if (!inScope(fields)) return null;
  const haystack = `${fields.categoryP} ${fields.groupP} ${fields.subgroupP} ${fields.name}`;
  let category = classifyIekDevice(haystack);
  if (!category) return null;

  const parsed = parseIekName(fields.name);
  const poles =
    parsed.poles ||
    (category === "voltage_relay" ? "1P" : category === "spd" ? "2P" : "1P");
  if (
    category === "breaker" &&
    ["2P", "3P", "4P", "3P+N"].includes(poles) &&
    Number(parsed.amps ?? 0) >= 40
  ) {
    category = "main_breaker";
  }

  const modules = polesToModules(poles, category);
  const ratingParts = [
    parsed.curve && parsed.amps ? `${parsed.curve}${parsed.amps}` : parsed.amps ? `${parsed.amps}A` : "",
    parsed.leakMa ? `${parsed.leakMa}mA` : "",
  ].filter(Boolean);
  const rating = ratingParts.join(" / ") || "—";
  const series = parsed.series || fields.subgroupP.split(" ").slice(-1)[0] || "IEK";
  const { brand, brandKey } = brandFromName(fields.name);
  const characteristics: Record<string, string> = {
    Тип: fields.subgroupP || fields.groupP,
    Артикул: fields.article,
    Полюса: poles,
    Модули: String(modules),
  };
  if (parsed.amps) characteristics["Номинальный ток"] = `${parsed.amps} A`;
  if (parsed.curve) characteristics["Кривая отключения"] = parsed.curve;
  if (parsed.leakMa) characteristics["Ток утечки"] = `${parsed.leakMa} mA`;
  if (parsed.breakingKa) characteristics["Откл. способность"] = `${parsed.breakingKa} кА`;

  const imageUrl = fields.png || fields.jpg || undefined;
  return {
    id: `iek:${fields.article}`,
    article: fields.article,
    name: fields.name,
    brand,
    brandKey,
    category,
    series,
    model: `${series} ${poles} ${rating}`.trim(),
    modules,
    poles,
    rating,
    characteristics,
    displayName: displayNameFor(category, poles, rating),
    imageUrl,
    imageJpg: fields.jpg || undefined,
    categoryP: fields.categoryP,
    groupP: fields.groupP,
    subgroupP: fields.subgroupP,
    source: "iek",
  };
}

async function* iterateXmlProducts(url: string): AsyncGenerator<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml" },
    cache: "no-store",
  });
  if (!res.ok || !res.body) {
    throw new Error(`IEK infobase download failed ${res.status} ${url}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const end = buf.indexOf("</Product>");
      if (end === -1) break;
      const start = buf.lastIndexOf("<Product>", end);
      const close = end + "</Product>".length;
      if (start >= 0) {
        yield buf.slice(start, close);
      }
      buf = buf.slice(close);
    }
    if (buf.length > 4_000_000) {
      buf = buf.slice(-250_000);
    }
  }
}

type CatalogRow = {
  id: string;
  source: string;
  article: string;
  name: string;
  brand: string;
  brandKey: string;
  category: string;
  series: string;
  model: string;
  modules: number;
  poles: string;
  rating: string;
  displayName: string;
  characteristics: Record<string, string>;
  imagePng: string | null;
  imageJpg: string | null;
  categoryP: string | null;
  groupP: string | null;
  subgroupP: string | null;
};

function toRow(product: CatalogProduct): CatalogRow {
  return {
    id: product.id,
    source: product.source ?? "iek",
    article: product.article,
    name: product.name,
    brand: product.brand,
    brandKey: product.brandKey,
    category: product.category,
    series: product.series,
    model: product.model,
    modules: product.modules,
    poles: product.poles,
    rating: product.rating,
    displayName: product.displayName,
    characteristics: product.characteristics,
    imagePng: product.imageUrl ?? null,
    imageJpg: product.imageJpg ?? null,
    categoryP: product.categoryP ?? null,
    groupP: product.groupP ?? null,
    subgroupP: product.subgroupP ?? null,
  };
}

async function flushBatch(batch: CatalogRow[]): Promise<void> {
  if (batch.length === 0) return;
  const sql = getSql();
  const ids = batch.map((row) => row.id);
  const sources = batch.map((row) => row.source);
  const articles = batch.map((row) => row.article);
  const names = batch.map((row) => row.name);
  const brands = batch.map((row) => row.brand);
  const brandKeys = batch.map((row) => row.brandKey);
  const categories = batch.map((row) => row.category);
  const series = batch.map((row) => row.series);
  const models = batch.map((row) => row.model);
  const modules = batch.map((row) => row.modules);
  const poles = batch.map((row) => row.poles);
  const ratings = batch.map((row) => row.rating);
  const displayNames = batch.map((row) => row.displayName);
  const characteristics = batch.map((row) =>
    JSON.stringify(row.characteristics),
  );
  const imagePngs = batch.map((row) => row.imagePng);
  const imageJpgs = batch.map((row) => row.imageJpg);
  const categoryPs = batch.map((row) => row.categoryP);
  const groupPs = batch.map((row) => row.groupP);
  const subgroupPs = batch.map((row) => row.subgroupP);

  await sql`
    INSERT INTO panel_catalog_products (
      id, source, article, name, brand, brand_key, category, series, model,
      modules, poles, rating, display_name, characteristics,
      image_png, image_jpg, category_p, group_p, subgroup_p, updated_at
    )
    SELECT
      x.id, x.source, x.article, x.name, x.brand, x.brand_key, x.category,
      x.series, x.model, x.modules, x.poles, x.rating, x.display_name,
      x.characteristics::jsonb, x.image_png, x.image_jpg,
      x.category_p, x.group_p, x.subgroup_p, NOW()
    FROM UNNEST(
      ${ids}::text[],
      ${sources}::text[],
      ${articles}::text[],
      ${names}::text[],
      ${brands}::text[],
      ${brandKeys}::text[],
      ${categories}::text[],
      ${series}::text[],
      ${models}::text[],
      ${modules}::int[],
      ${poles}::text[],
      ${ratings}::text[],
      ${displayNames}::text[],
      ${characteristics}::text[],
      ${imagePngs}::text[],
      ${imageJpgs}::text[],
      ${categoryPs}::text[],
      ${groupPs}::text[],
      ${subgroupPs}::text[]
    ) AS x(
      id, source, article, name, brand, brand_key, category, series, model,
      modules, poles, rating, display_name, characteristics,
      image_png, image_jpg, category_p, group_p, subgroup_p
    )
    ON CONFLICT (id) DO UPDATE SET
      source = EXCLUDED.source,
      article = EXCLUDED.article,
      name = EXCLUDED.name,
      brand = EXCLUDED.brand,
      brand_key = EXCLUDED.brand_key,
      category = EXCLUDED.category,
      series = EXCLUDED.series,
      model = EXCLUDED.model,
      modules = EXCLUDED.modules,
      poles = EXCLUDED.poles,
      rating = EXCLUDED.rating,
      display_name = EXCLUDED.display_name,
      characteristics = EXCLUDED.characteristics,
      image_png = EXCLUDED.image_png,
      image_jpg = EXCLUDED.image_jpg,
      category_p = EXCLUDED.category_p,
      group_p = EXCLUDED.group_p,
      subgroup_p = EXCLUDED.subgroup_p,
      updated_at = NOW()
  `;
}

export async function syncIekInfobase(): Promise<{
  scanned: number;
  imported: number;
  skipped: number;
  byCategory: Record<string, number>;
}> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM panel_catalog_products WHERE source = 'iek'`;

  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  const byCategory: Record<string, number> = {};
  let batch: CatalogRow[] = [];

  for await (const xml of iterateXmlProducts(IEK_IMAGES_XML_URL)) {
    scanned += 1;
    const fields = parseIekProductXml(xml);
    if (!fields) {
      skipped += 1;
      continue;
    }
    const product = iekFieldsToCatalogProduct(fields);
    if (!product) {
      skipped += 1;
      continue;
    }
    imported += 1;
    byCategory[product.category] = (byCategory[product.category] ?? 0) + 1;
    batch.push(toRow(product));
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      batch = [];
    }
  }
  await flushBatch(batch);

  return { scanned, imported, skipped, byCategory };
}

export async function countIekCatalog(): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const [row] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM panel_catalog_products
    WHERE source = 'iek'
  `) as Array<{ count: number }>;
  return row?.count ?? 0;
}
