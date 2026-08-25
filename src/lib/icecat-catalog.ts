import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip, gunzipSync } from "node:zlib";
import type { CatalogApplianceKind } from "@/lib/appliance-catalog-enrichment";
import { ensureSchema } from "@/lib/db";
import { getSql } from "@/lib/sql-client";
import { searchIcecatProduct } from "@/lib/icecat";
import type { ApplianceManual, ApplianceSpec } from "@/types";

const REFS_BASE = "https://data.icecat.biz/export/freexml/refs";
const INDEX_URL =
  "https://data.icecat.biz/export/freexml/EN/files.index.csv.gz";

/** Map Icecat category name (EN) → our appliance kind. */
const CATEGORY_KIND_RULES: Array<{
  kind: CatalogApplianceKind;
  match: RegExp;
}> = [
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
  {
    kind: "tv",
    match: /\btvs?\b|\btelevisions?\b|\bLED\b|\bLCD\b|\bOLED\b|\bQLED\b|\bplasma\b/i,
  },
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

function parseCategoriesToKindMap(xml: string): Map<string, CatalogApplianceKind> {
  const map = new Map<string, CatalogApplianceKind>();
  const categoryBlocks = xml.match(/<Category\b[\s\S]*?<\/Category>/gi) ?? [];
  const matchedNames: Array<{ id: string; name: string; kind: CatalogApplianceKind }> =
    [];
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
    for (const rule of CATEGORY_KIND_RULES) {
      if (rule.match.test(name)) {
        map.set(id, rule.kind);
        if (matchedNames.length < 40) {
          matchedNames.push({ id, name, kind: rule.kind });
        }
        break;
      }
    }
  }
  // Stash for sync diagnostics
  lastMatchedCategorySample = matchedNames;
  return map;
}

let lastMatchedCategorySample: Array<{
  id: string;
  name: string;
  kind: CatalogApplianceKind;
}> = [];

export function getLastMatchedCategorySample() {
  return lastMatchedCategorySample;
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
  // Neon HTTP: one round-trip per row is too slow; chunk small parallel groups.
  const parallel = 25;
  for (let i = 0; i < batch.length; i += parallel) {
    const slice = batch.slice(i, i + parallel);
    await Promise.all(
      slice.map(
        (p) => sql`
          INSERT INTO icecat_appliance_products (
            icecat_id, kind, brand, product_code, model_name, on_market, updated_at
          ) VALUES (
            ${p.id}, ${p.kind}, ${p.brand}, ${p.productCode}, ${p.modelName}, TRUE, NOW()
          )
          ON CONFLICT (icecat_id) DO UPDATE SET
            kind = EXCLUDED.kind,
            brand = EXCLUDED.brand,
            product_code = EXCLUDED.product_code,
            model_name = EXCLUDED.model_name,
            on_market = TRUE,
            updated_at = NOW()
        `,
      ),
    );
  }
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
  const brandName = suppliers.get(supplierId) ?? (supplierId ? `Brand ${supplierId}` : "");
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
  byKind: Record<string, number>;
  matchedCategories: Array<{
    id: string;
    name: string;
    kind: CatalogApplianceKind;
  }>;
}> {
  await ensureSchema();
  const sql = getSql();
  const syncStartedAt = new Date().toISOString();

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

  const lines = await openIcecatGunzipLines(INDEX_URL);
  let headerParsed = false;
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
  const byKind: Record<string, number> = {};
  const seen = new Set<string>();
  let batch: IcecatCatalogProduct[] = [];

  for await (const line of lines) {
    if (!line) continue;
    scannedLines += 1;
    if (!headerParsed) {
      const cols = splitCsvLine(line).map((h) => h.toLowerCase());
      const idx = (names: string[]) => cols.findIndex((h) => names.includes(h));
      header = {
        iProductId: idx(["product_id", "productid", "icecat_id", "path"]),
        iSupplier: idx(["supplier_id", "supplierid"]),
        iProdId: idx(["prod_id", "product_code", "productcode"]),
        iCat: idx(["catid", "category_id", "cat_id"]),
        iModel: idx(["model_name", "modelname", "name"]),
        iOnMarket: idx(["on_market", "onmarket"]),
      };
      headerParsed = true;
      continue;
    }

    const product = mapIndexRow(
      splitCsvLine(line),
      header,
      catKind,
      suppliers,
    );
    if (!product) continue;
    const key = `${product.kind}|${product.brand}|${product.productCode}|${product.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    batch.push(product);
    byKind[product.kind] = (byKind[product.kind] ?? 0) + 1;
    products += 1;

    if (batch.length >= 200) {
      await flushProductBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushProductBatch(batch);
  }

  await sql`
    DELETE FROM icecat_appliance_products
    WHERE updated_at < ${syncStartedAt}::timestamptz
  `;

  await sql`
    INSERT INTO schema_meta (key, value)
    VALUES ('icecat_catalog_synced_at', ${new Date().toISOString()})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  return {
    categories: catKind.size,
    suppliers: suppliers.size,
    products,
    scannedLines,
    byKind,
    matchedCategories: lastMatchedCategorySample,
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

function extractPowerWatts(specs: ApplianceSpec[]): number | undefined {
  for (const spec of specs) {
    const label = spec.label.toLowerCase();
    if (!/power|watt|мощност|потребл/.test(label)) continue;
    if (/standby|sleep|энергопотреб|energy consumption|kwh/i.test(label)) {
      continue;
    }
    const m = spec.value.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(k?\s*w)/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const unit = m[2]!.toLowerCase().replace(/\s/g, "");
    const watts = unit.startsWith("kw") ? Math.round(n * 1000) : Math.round(n);
    if (watts >= 20 && watts <= 20000) return watts;
  }
  return undefined;
}

export async function loadIcecatProductDetails(options: {
  brand: string;
  productCode: string;
}): Promise<{
  powerW?: number;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  title?: string;
  matched: boolean;
  status: string;
}> {
  const result = await searchIcecatProduct({
    brand: options.brand,
    model: options.productCode,
    lang: "EN",
  });
  if (!result.hit) {
    return {
      specs: [],
      manuals: [],
      matched: false,
      status: result.status,
    };
  }
  return {
    powerW: extractPowerWatts(result.hit.specs),
    specs: result.hit.specs,
    manuals: result.hit.manuals,
    title: result.hit.title,
    matched: true,
    status: result.status,
  };
}
