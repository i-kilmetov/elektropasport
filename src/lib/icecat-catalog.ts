import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip, gunzipSync } from "node:zlib";
import type { CatalogApplianceKind } from "@/lib/appliance-catalog-enrichment";
import { ensureSchema } from "@/lib/db";
import { getSql } from "@/lib/sql-client";
import {
  ICECAT_APPLIANCE_LANG,
  searchIcecatProduct,
  searchIcecatProductByIcecatId,
} from "@/lib/icecat";
import type { ApplianceManual, ApplianceSpec } from "@/types";
import { extractPowerWattsFromSpecs } from "@/lib/appliance-specs";

const REFS_BASE = "https://data.icecat.biz/export/freexml/refs";
const INDEX_URL =
  "https://data.icecat.biz/export/freexml/EN/files.index.csv.gz";

/** Skip industrial / non-home categories before kind mapping. */
const INDUSTRIAL_CATEGORY =
  /\bindustrial\b|\bcommercial grade\b|\bprofessional use\b|\bserver room\b|\bdata center\b|\bdatacenter\b|\brack\s*mount\b|\benterprise switch\b|\bmedical device\b|\blaboratory\b|\bwelding machine\b|\bpos terminal\b|\bcash register\b|\bvending machine\b|\bindustrial vacuum\b|\bfloor scrubber\b|\bpressure washer\b|\bwoodworking router\b/i;

/** Map Icecat category name (EN) → our appliance kind. First match wins. */
const CATEGORY_KIND_RULES: Array<{
  kind: CatalogApplianceKind;
  match: RegExp;
}> = [
  { kind: "hair_dryer", match: /\bhair dryers?\b|\bhairdryers?\b/i },
  {
    kind: "steam_mop",
    match: /\bsteam mops?\b|\bsteam sweepers?\b|\belectric mops?\b/i,
  },
  {
    kind: "steam_cleaner",
    match: /\bsteam cleaners?\b|\bsteam vacuums?\b/i,
  },
  {
    kind: "electric_shaver",
    match:
      /\belectric shavers?\b|\bepilators?\b|\bbeard trimmers?\b|\bbody groomers?\b/i,
  },
  {
    kind: "electric_toothbrush",
    match: /\belectric toothbrushes?\b|\boral irrigators?\b/i,
  },
  { kind: "projector", match: /\bprojectors?\b|\bbeamers?\b/i },
  { kind: "soundbar", match: /\bsoundbars?\b|\bsound bars?\b/i },
  {
    kind: "home_theater",
    match:
      /\bhome cinema\b|\bhome theater\b|\bhome theatre\b|\bav receivers?\b|\bhi-fi systems?\b/i,
  },
  {
    kind: "router",
    match: /\bwifi routers?\b|\bwireless routers?\b|\brouters?\b|\bmesh systems?\b/i,
  },
  {
    kind: "smart_speaker",
    match: /\bsmart speakers?\b|\bsmart displays?\b|\bvoice assistants?\b/i,
  },
  {
    kind: "electric_fireplace",
    match: /\belectric fireplaces?\b|\bflame effect fires?\b/i,
  },
  { kind: "electric_blanket", match: /\belectric blankets?\b|\bheated throws?\b/i },
  {
    kind: "towel_warmer",
    match: /\btowel warmers?\b|\belectric towel rails?\b/i,
  },
  {
    kind: "chest_freezer",
    match: /\bchest freezers?\b|\bdeep freezers?\b/i,
  },
  {
    kind: "minibar",
    match: /\bmini bars?\b|\bmini fridges?\b|\bminibars?\b/i,
  },
  {
    kind: "waffle_maker",
    match: /\bwaffle makers?\b|\bcrepe makers?\b|\bpancake makers?\b/i,
  },
  { kind: "yogurt_maker", match: /\byogurt makers?\b/i },
  { kind: "electric_knife", match: /\belectric knives?\b/i },
  { kind: "meat_slicer", match: /\bmeat slicers?\b/i },
  {
    kind: "garbage_disposal",
    match: /\bfood waste disposers?\b|\bgarbage disposals?\b/i,
  },
  { kind: "warming_drawer", match: /\bwarming drawers?\b|\bplate warmers?\b/i },
  {
    kind: "baby_food_maker",
    match:
      /\bbottle warmers?\b|\bbaby food makers?\b|\bsterilisers?\b|\bsterilizers?\b/i,
  },
  {
    kind: "scale",
    match: /\bbathroom scales?\b|\bbody scales?\b|\bweighing scales?\b/i,
  },
  {
    kind: "massager",
    match: /\bmassagers?\b|\bmassage devices?\b|\bmassage guns?\b/i,
  },
  { kind: "robot_vacuum", match: /\brobot(?:ic)? vacuums?\b/i },
  {
    kind: "vacuum",
    match: /\bvacuum cleaners?\b|\bcanister vacuums?\b|\bupright vacuums?\b|\bhandheld vacuums?\b/i,
  },
  {
    kind: "coffee_maker",
    match: /\bcoffee makers?\b|\bespresso machines?\b|\bcoffee machines?\b/i,
  },
  {
    kind: "kettle",
    match: /\belectric kettles?\b|\bwater kettles?\b|\bkettles?\b/i,
  },
  {
    kind: "toaster",
    match: /\btoasters?\b|\bsandwich makers?\b|\btoaster ovens?\b/i,
  },
  {
    kind: "blender_mixer",
    match: /\bblenders?\b|\bstand mixers?\b|\bhand mixers?\b|\bstick mixers?\b/i,
  },
  {
    kind: "food_processor",
    match: /\bfood processors?\b|\bchoppers?\b|\bkitchen machines?\b/i,
  },
  {
    kind: "multicooker",
    match: /\bmulticookers?\b|\bslow cookers?\b|\brice cookers?\b|\bpressure cookers?\b/i,
  },
  {
    kind: "steamer",
    match: /\bsteam cookers?\b|\bfood steamers?\b/i,
  },
  {
    kind: "air_fryer",
    match: /\bair fryers?\b|\bdeep fryers?\b|\bfryers?\b/i,
  },
  {
    kind: "grill",
    match: /\belectric grills?\b|\bcontact grills?\b|\bgrills?\b|\bbarbecues?\b/i,
  },
  { kind: "juicer", match: /\bjuicers?\b|\bcitrus presses?\b/i },
  {
    kind: "bread_maker",
    match: /\bbread makers?\b|\bbread machines?\b/i,
  },
  { kind: "ice_maker", match: /\bice makers?\b|\bice machines?\b/i },
  {
    kind: "hood",
    match: /\bextractor hoods?\b|\brange hoods?\b|\bcooker hoods?\b|\b(?:kitchen )?hoods?\b/i,
  },
  {
    kind: "wine_cooler",
    match: /\bwine coolers?\b|\bwine cabinets?\b|\bwine cellars?\b/i,
  },
  {
    kind: "water_dispenser",
    match: /\bwater dispensers?\b|\bwater coolers?\b/i,
  },
  {
    kind: "iron",
    match: /\bsteam irons?\b|\bgarment steamers?\b|\bsteam generators?\b|\birons?\b/i,
  },
  {
    kind: "sewing_machine",
    match: /\bsewing machines?\b|\boverlockers?\b|\bsergers?\b/i,
  },
  {
    kind: "humidifier",
    match: /\bhumidifiers?\b|\bdehumidifiers?\b|\bair purifiers?\b/i,
  },
  {
    kind: "fan",
    match: /\btable fans?\b|\bceiling fans?\b|\btower fans?\b|\b(?:desk )?fans?\b|\bventilators?\b/i,
  },
  {
    kind: "pump",
    match: /\bsump pumps?\b|\bcirculation pumps?\b|\bwater pumps?\b|\bpumps?\b/i,
  },
  {
    kind: "sauna",
    match: /\bsaunas?\b|\binfrared cabins?\b|\bsauna heaters?\b/i,
  },
  { kind: "washer", match: /\bwashing machines?\b|\bwasher[- ]?dryers?\b/i },
  { kind: "dryer", match: /\btumble dryers?\b|\bdryers?\b/i },
  { kind: "dishwasher", match: /\bdishwashers?\b/i },
  {
    kind: "fridge",
    match: /\brefrigerators?\b|\bfridge[- ]?freezers?\b|\bfreezers?\b/i,
  },
  { kind: "oven", match: /\bovens?\b|\bcookers?\b/i },
  { kind: "microwave", match: /\bmicrowaves?\b/i },
  { kind: "hob", match: /\bhobs?\b|\bcooktops?\b|\bcooking zones?\b/i },
  {
    kind: "ac",
    match: /\bair[- ]?conditioners?\b|\bsplit[- ]?system\b/i,
  },
  {
    kind: "boiler",
    match: /\bwater heaters?\b|\bboilers?\b|\bcalorifiers?\b/i,
  },
  { kind: "tv", match: /\btelevisions?\b|\b(?:LED|LCD|OLED|QLED|Plasma)\s*TVs?\b|\bCRT TVs?\b/i },
  {
    kind: "heater",
    match: /\bspace heaters?\b|\bconvectors?\b|\bradiators?\b|\bfan heaters?\b/i,
  },
];

export type IcecatCatalogProduct = {
  id: string;
  kind: CatalogApplianceKind;
  brand: string;
  productCode: string;
  modelName: string;
};

function icecatUsername(): string | null {
  return process.env.ICECAT_USERNAME?.trim() || null;
}

function icecatPassword(): string | null {
  return process.env.ICECAT_PASSWORD?.trim() || null;
}

function icecatAuthHeader(): string | null {
  const user = icecatUsername();
  const pass = icecatPassword();
  if (!user || !pass) return null;
  const token = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function isIcecatCatalogSyncConfigured(): boolean {
  return Boolean(icecatUsername() && icecatPassword());
}

function icecatDownloadHeaders(): Record<string, string> {
  const auth = icecatAuthHeader();
  if (!auth) {
    throw new Error(
      "Для синхронизации каталога Icecat нужен ICECAT_USERNAME и ICECAT_PASSWORD (пароль от входа на icecat.biz)",
    );
  }
  const headers: Record<string, string> = {
    Authorization: auth,
    Accept: "*/*",
  };
  const apiToken = process.env.ICECAT_API_TOKEN?.trim();
  const contentToken = process.env.ICECAT_CONTENT_TOKEN?.trim();
  if (apiToken) headers["api-token"] = apiToken;
  if (contentToken) headers["content-token"] = contentToken;
  return headers;
}

async function downloadGunzipText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: icecatDownloadHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Icecat download failed ${res.status} ${url}: ${body.slice(0, 180)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  try {
    return gunzipSync(buf).toString("utf8");
  } catch {
    return buf.toString("utf8");
  }
}

async function openIcecatGunzipLines(
  url: string,
): Promise<AsyncIterable<string>> {
  const res = await fetch(url, {
    headers: icecatDownloadHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Icecat download failed ${res.status} ${url}: ${body.slice(0, 180)}`,
    );
  }
  if (!res.body) {
    throw new Error(`Icecat download returned empty body: ${url}`);
  }
  const nodeIn = Readable.fromWeb(
    res.body as import("node:stream/web").ReadableStream,
  );
  const gunzip = createGunzip();
  nodeIn.on("error", (err) => gunzip.destroy(err));
  return createInterface({ input: nodeIn.pipe(gunzip), crlfDelay: Infinity });
}

let lastMatchedCategorySample: Array<{
  id: string;
  name: string;
  kind: CatalogApplianceKind;
}> = [];
let lastMatchedCategoryById = new Map<
  string,
  { name: string; kind: CatalogApplianceKind }
>();

export function getLastMatchedCategorySample() {
  return lastMatchedCategorySample;
}

function parseCategoriesToKindMap(xml: string): Map<string, CatalogApplianceKind> {
  const map = new Map<string, CatalogApplianceKind>();
  const categoryBlocks = xml.match(/<Category\b[\s\S]*?<\/Category>/gi) ?? [];
  const matchedNames: Array<{ id: string; name: string; kind: CatalogApplianceKind }> =
    [];
  const byId = new Map<string, { name: string; kind: CatalogApplianceKind }>();
  for (const block of categoryBlocks) {
    const openTag = block.match(/^<Category\b[^>]*>/i)?.[0] ?? "";
    const id = openTag.match(/\bID="(\d+)"/i)?.[1];
    if (!id) continue;
    // Prefer English name langid="1"
    const names = [
      ...block.matchAll(/<Name\b[^>]*langid="1"[^>]*Value="([^"]*)"/gi),
      ...block.matchAll(/<Name\b[^>]*Value="([^"]*)"[^>]*langid="1"/gi),
      ...block.matchAll(/<Name\b[^>]*Value="([^"]*)"/gi),
    ];
    const name = names[0]?.[1]?.trim() ?? "";
    if (!name) continue;
    if (INDUSTRIAL_CATEGORY.test(name)) continue;
    for (const rule of CATEGORY_KIND_RULES) {
      if (!rule.match.test(name)) continue;
      if (
        rule.kind === "tv" &&
        /mount|stand|tuner|monitor|set-top|set top/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "dryer" &&
        /hair|hand|clothes dryer rack|dehumidifier/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "router" &&
        /router table|woodworking|CNC/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "electric_shaver" &&
        /hedge|grass|garden|lawn/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "fan" &&
        /fan heater|heat fan|heater fan|exhaust fan kit|cpu fan|case fan/i.test(
          name,
        )
      ) {
        continue;
      }
      if (
        rule.kind === "grill" &&
        /accessories|cover|spare|cleaning|brush/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "kettle" &&
        /whistle|stovetop|gas kettle|travel mug/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "iron" &&
        /ironing board|ironing cover|ironing mat/i.test(name)
      ) {
        continue;
      }
      if (
        rule.kind === "vacuum" &&
        /robot|accessories|bags|filters|parts/i.test(name)
      ) {
        continue;
      }
      map.set(id, rule.kind);
      byId.set(id, { name, kind: rule.kind });
      if (matchedNames.length < 40) {
        matchedNames.push({ id, name, kind: rule.kind });
      }
      break;
    }
  }
  lastMatchedCategorySample = matchedNames;
  lastMatchedCategoryById = byId;
  return map;
}

function parseSuppliers(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  // Icecat refs: <Supplier ID="1" Sponsor="1" Name="HP" ...>
  for (const m of xml.matchAll(/<Supplier\b[^>]*>/gi)) {
    const tag = m[0]!;
    const id = tag.match(/\bID="(\d+)"/i)?.[1];
    const name = tag.match(/\bName="([^"]+)"/i)?.[1]?.trim();
    if (id && name) map.set(id, name);
  }
  return map;
}

function splitCsvLine(line: string): string[] {
  // Open Icecat files.index is tab-separated; some dumps use comma/semicolon CSV.
  const tabCount = (line.match(/\t/g) ?? []).length;
  const commaCount = (line.match(/,/g) ?? []).length;
  if (tabCount > 0 && tabCount >= commaCount) {
    return line.split("\t").map((v) => v.trim());
  }

  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

async function flushProductBatch(
  batch: IcecatCatalogProduct[],
): Promise<void> {
  if (batch.length === 0) return;
  const sql = getSql();
  const ids = batch.map((p) => p.id);
  const kinds = batch.map((p) => p.kind);
  const brands = batch.map((p) => p.brand);
  const codes = batch.map((p) => p.productCode);
  const names = batch.map((p) => p.modelName);
  await sql`
    INSERT INTO icecat_appliance_products (
      icecat_id, kind, brand, product_code, model_name, on_market, updated_at
    )
    SELECT
      x.icecat_id,
      x.kind,
      x.brand,
      x.product_code,
      x.model_name,
      TRUE,
      NOW()
    FROM UNNEST(
      ${ids}::text[],
      ${kinds}::text[],
      ${brands}::text[],
      ${codes}::text[],
      ${names}::text[]
    ) AS x(icecat_id, kind, brand, product_code, model_name)
    ON CONFLICT (icecat_id) DO UPDATE SET
      kind = EXCLUDED.kind,
      brand = EXCLUDED.brand,
      product_code = EXCLUDED.product_code,
      model_name = EXCLUDED.model_name,
      on_market = TRUE,
      updated_at = NOW()
  `;
}

function mapIndexRow(
  cols: string[],
  header: {
    iProductId: number;
    iSupplier: number;
    iProdId: number;
    iCat: number;
    iModel: number;
    iOnMarket: number;
  },
  catKind: Map<string, CatalogApplianceKind>,
  suppliers: Map<string, string>,
): IcecatCatalogProduct | null {
  const catid =
    (header.iCat >= 0 ? cols[header.iCat] : cols[6])?.replace(/\D/g, "") ?? "";
  const kind = catKind.get(catid);
  if (!kind) return null;

  const supplierId = (header.iSupplier >= 0 ? cols[header.iSupplier] : cols[4]) ?? "";
  const brandName = suppliers.get(supplierId)?.trim() ?? "";
  if (!brandName) return null;

  let productId = (header.iProductId >= 0 ? cols[header.iProductId] : cols[1]) ?? "";
  if (productId.includes("/")) {
    const m = productId.match(/(\d+)\.xml/i);
    productId = m?.[1] ?? productId;
  }
  productId = productId.replace(/\D/g, "") || productId;
  if (!productId) return null;

  const productCode = (
    (header.iProdId >= 0 ? cols[header.iProdId] : cols[5]) ?? ""
  ).trim();
  const modelName = (
    (header.iModel >= 0 ? cols[header.iModel] : cols[9] ?? cols[8] ?? productCode) ??
    productCode
  ).trim();
  if (!productCode && !modelName) return null;

  const onMarketRaw =
    (header.iOnMarket >= 0 ? cols[header.iOnMarket] : cols[7]) ?? "1";
  if (onMarketRaw === "0" || onMarketRaw.toLowerCase() === "false") return null;

  return {
    id: productId,
    kind,
    brand: brandName,
    productCode: productCode || modelName,
    modelName: modelName || productCode,
  };
}

export async function syncIcecatApplianceCatalog(): Promise<{
  categories: number;
  suppliers: number;
  products: number;
  scannedLines: number;
  categoryHits: number;
  byKind: Record<string, number>;
  matchedCategories: Array<{
    id: string;
    name: string;
    kind: CatalogApplianceKind;
  }>;
  headerCols: string[];
  headerIndex: Record<string, number>;
  topCategoryHits: Array<{
    id: string;
    count: number;
    kind: CatalogApplianceKind | null;
    name: string | null;
  }>;
  rawSamples: string[];
}> {
  await ensureSchema();
  const sql = getSql();

  const [categoriesXml, suppliersXml] = await Promise.all([
    downloadGunzipText(`${REFS_BASE}/CategoriesList.xml.gz`),
    downloadGunzipText(`${REFS_BASE}/SuppliersList.xml.gz`),
  ]);

  const catKind = parseCategoriesToKindMap(categoriesXml);
  const suppliers = parseSuppliers(suppliersXml);
  if (catKind.size === 0) {
    throw new Error(
      "Icecat CategoriesList разобран, но подходящих категорий техники не найдено",
    );
  }
  if (suppliers.size === 0) {
    throw new Error("Icecat SuppliersList пуст или не разобран");
  }

  // Replace catalog atomically-enough for bootstrap: clear first so a timed-out
  // run cannot leave stale wrong categories behind.
  await sql`DELETE FROM icecat_appliance_products`;

  const lines = await openIcecatGunzipLines(INDEX_URL);
  let headerParsed = false;
  let headerCols: string[] = [];
  let header = {
    iProductId: -1,
    iSupplier: -1,
    iProdId: -1,
    iCat: -1,
    iModel: -1,
    iOnMarket: -1,
  };
  let scannedLines = 0;
  let products = 0;
  let categoryHits = 0;
  const byKind: Record<string, number> = {};
  const hitsByCatid: Record<string, number> = {};
  const seen = new Set<string>();
  let batch: IcecatCatalogProduct[] = [];
  const rawSamples: string[] = [];

  for await (const line of lines) {
    if (!line) continue;
    scannedLines += 1;
    if (!headerParsed) {
      headerCols = splitCsvLine(line).map((h) => h.toLowerCase().replace(/^\uFEFF/, ""));
      const idx = (names: string[]) => {
        for (const name of names) {
          const i = headerCols.indexOf(name);
          if (i >= 0) return i;
        }
        return -1;
      };
      header = {
        iProductId: idx(["product_id", "productid", "icecat_id"]),
        iSupplier: idx(["supplier_id", "supplierid"]),
        iProdId: idx(["prod_id", "product_code", "productcode"]),
        iCat: idx(["catid", "category_id", "cat_id"]),
        iModel: idx(["model_name", "modelname", "name"]),
        iOnMarket: idx(["on_market", "onmarket"]),
      };
      if (header.iProductId < 0 && headerCols[0] === "path") {
        header.iProductId = 1;
      }
      if (header.iSupplier < 0) header.iSupplier = 4;
      if (header.iProdId < 0) header.iProdId = 5;
      if (header.iCat < 0) header.iCat = 6;
      if (header.iModel < 0) header.iModel = 11;
      if (header.iOnMarket < 0) header.iOnMarket = 9;
      headerParsed = true;
      continue;
    }

    if (rawSamples.length < 3) rawSamples.push(line.slice(0, 240));

    const cols = splitCsvLine(line);
    const catid =
      (header.iCat >= 0 ? cols[header.iCat] : cols[6])?.replace(/\D/g, "") ?? "";
    if (catid && catKind.has(catid)) {
      categoryHits += 1;
      hitsByCatid[catid] = (hitsByCatid[catid] ?? 0) + 1;
    }

    const product = mapIndexRow(cols, header, catKind, suppliers);
    if (!product) continue;
    const key = `${product.kind}|${product.brand}|${product.productCode}|${product.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    batch.push(product);
    byKind[product.kind] = (byKind[product.kind] ?? 0) + 1;
    products += 1;

    if (batch.length >= 500) {
      await flushProductBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushProductBatch(batch);
  }

  await sql`
    INSERT INTO schema_meta (key, value)
    VALUES ('icecat_catalog_synced_at', ${new Date().toISOString()})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  const topHits = Object.entries(hitsByCatid)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([id, count]) => {
      const meta = lastMatchedCategoryById.get(id);
      return {
        id,
        count,
        kind: meta?.kind ?? catKind.get(id) ?? null,
        name: meta?.name ?? null,
      };
    });

  return {
    categories: catKind.size,
    suppliers: suppliers.size,
    products,
    scannedLines,
    categoryHits,
    byKind,
    matchedCategories: lastMatchedCategorySample,
    headerCols,
    headerIndex: header,
    topCategoryHits: topHits,
    rawSamples,
  };
}

export async function listIcecatBrands(
  kind: CatalogApplianceKind,
): Promise<string[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT DISTINCT brand
    FROM icecat_appliance_products
    WHERE kind = ${kind}
    ORDER BY brand ASC
  `) as Array<{ brand: string }>;
  return rows.map((r) => r.brand);
}

export async function listIcecatModels(
  kind: CatalogApplianceKind,
  brand: string,
): Promise<IcecatCatalogProduct[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT icecat_id, kind, brand, product_code, model_name
    FROM icecat_appliance_products
    WHERE kind = ${kind} AND brand = ${brand}
    ORDER BY model_name ASC
    LIMIT 2000
  `) as Array<{
    icecat_id: string;
    kind: string;
    brand: string;
    product_code: string;
    model_name: string;
  }>;
  return rows.map((r) => ({
    id: r.icecat_id,
    kind: r.kind as CatalogApplianceKind,
    brand: r.brand,
    productCode: r.product_code,
    modelName: r.model_name,
  }));
}

export async function getIcecatCatalogProduct(
  icecatId: string,
): Promise<IcecatCatalogProduct | null> {
  await ensureSchema();
  const sql = getSql();
  const [row] = (await sql`
    SELECT icecat_id, kind, brand, product_code, model_name
    FROM icecat_appliance_products
    WHERE icecat_id = ${icecatId}
    LIMIT 1
  `) as Array<{
    icecat_id: string;
    kind: string;
    brand: string;
    product_code: string;
    model_name: string;
  }>;
  if (!row) return null;
  return {
    id: row.icecat_id,
    kind: row.kind as CatalogApplianceKind,
    brand: row.brand,
    productCode: row.product_code,
    modelName: row.model_name,
  };
}

export async function countIcecatCatalog(): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const [row] = (await sql`
    SELECT COUNT(*)::int AS count FROM icecat_appliance_products
  `) as Array<{ count: number }>;
  return row?.count ?? 0;
}

export async function loadIcecatProductDetails(options: {
  brand?: string;
  productCode?: string;
  icecatId?: string;
}): Promise<{
  powerW?: number;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  title?: string;
  brandLogoUrl?: string;
  productImageUrl?: string;
  matched: boolean;
  status: string;
  statusDetail?: string;
}> {
  const byId = options.icecatId
    ? await searchIcecatProductByIcecatId({
        icecatId: options.icecatId,
        lang: ICECAT_APPLIANCE_LANG,
      })
    : null;

  let result = byId;
  if (!result?.hit && options.brand && options.productCode) {
    result = await searchIcecatProduct({
      brand: options.brand,
      model: options.productCode,
      lang: ICECAT_APPLIANCE_LANG,
    });
  }

  if (!result) {
    return {
      specs: [],
      manuals: [],
      matched: false,
      status: "not_found",
    };
  }

  if (!result.hit) {
    return {
      specs: [],
      manuals: [],
      matched: false,
      status: result.status,
      statusDetail: result.detail,
    };
  }
  return {
    powerW: extractPowerWattsFromSpecs(result.hit.specs),
    specs: result.hit.specs,
    manuals: result.hit.manuals,
    title: result.hit.title,
    brandLogoUrl: result.hit.brandLogoUrl,
    productImageUrl: result.hit.productImageUrl,
    matched: true,
    status: result.status,
    statusDetail: result.detail,
  };
}
