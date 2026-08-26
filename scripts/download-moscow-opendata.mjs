#!/usr/bin/env node
/**
 * Download Moscow open-data dumps (houses + capital repair) for offline cache.
 *
 * Run from a machine in Russia (apidata.mos.ru often blocks non-RU IPs):
 *
 *   export MOS_DATA_API_KEY='your-key'
 *   node scripts/download-moscow-opendata.mjs
 *
 * Optional:
 *   MOS_DOM_PASSPORT_DATASET_ID=60562
 *   MOS_CAPITAL_REPAIR_DATASET_ID=<id>
 *   MOS_DATA_OUT_DIR=data/moscow
 */

import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import path from "node:path";

const BASE = "https://apidata.mos.ru/v1";
const PAGE = Number.parseInt(process.env.MOS_DATA_PAGE_SIZE ?? "200", 10) || 200;
const OUT_DIR = process.env.MOS_DATA_OUT_DIR?.trim() || "data/moscow";
const MAX_RETRIES = 8;

function apiKey() {
  const key = process.env.MOS_DATA_API_KEY?.trim();
  if (!key) {
    console.error(
      "Задайте MOS_DATA_API_KEY (ключ с https://data.mos.ru/developers ).",
    );
    process.exit(1);
  }
  return key;
}

async function mosGet(pathname, search = {}) {
  const url = new URL(`${BASE}${pathname}`);
  url.searchParams.set("api_key", apiKey());
  // Browser defaults to XML; force JSON for Node.
  if (!("$format" in search)) url.searchParams.set("$format", "json");
  for (const [k, v] of Object.entries(search)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const text = await res.text();
      if (res.status >= 500) {
        lastError = new Error(
          `HTTP ${res.status} ${pathname}: ${text.slice(0, 300)}`,
        );
        const waitMs = Math.min(30_000, 1000 * 2 ** (attempt - 1));
        console.warn(
          `\nRetry ${attempt}/${MAX_RETRIES} after ${res.status} (wait ${waitMs}ms)…`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${pathname}: ${text.slice(0, 300)}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Ответ не JSON (${pathname}). Начало ответа: ${text.slice(0, 200)}`,
        );
      }

      return unwrapMosPayload(data);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= MAX_RETRIES) break;
      if (/HTTP 4\d\d/.test(lastError.message) && !/HTTP 429/.test(lastError.message)) {
        throw lastError;
      }
      const waitMs = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      console.warn(
        `\nRetry ${attempt}/${MAX_RETRIES} after error: ${lastError.message.slice(0, 120)} (wait ${waitMs}ms)…`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError ?? new Error(`Failed ${pathname}`);
}

/** API may return a bare array or an OData wrapper { Items: [...] }. */
function unwrapMosPayload(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.Results)) return data.Results;

  // Single dataset / meta object — leave as-is
  return data;
}

function stringifyCellValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyCellValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    for (const key of [
      "Address",
      "address",
      "ADDRESS",
      "AddressMKD",
      "SIMPLE_ADDRESS",
      "FullAddress",
      "value",
      "Value",
      "name",
      "Name",
    ]) {
      if (value[key] != null && String(value[key]).trim()) {
        return String(value[key]).trim();
      }
    }
    for (const [k, v] of Object.entries(value)) {
      if (/address|адрес/i.test(k) && v != null && String(v).trim()) {
        return String(v).trim();
      }
    }
  }
  return "";
}

function cellString(cells, keys) {
  if (!cells || typeof cells !== "object") return "";
  for (const key of keys) {
    const text = stringifyCellValue(cells[key]);
    if (text) return text;
  }
  const lower = new Map(
    Object.entries(cells).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const text = stringifyCellValue(lower.get(key.toLowerCase()));
    if (text) return text;
  }
  return "";
}

function parseYear(raw) {
  if (raw == null || raw === "") return null;
  const match = String(raw).match(/(18|19|20)\d{2}/);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 1800 && year <= 2100 ? year : null;
}

function normalizePart(value) {
  return String(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ADDRESS_KEYS = [
  "address",
  "Address",
  "ObjectAddress",
  "AddressMKD",
  "ADDRESS",
  "SIMPLE_ADDRESS",
  "FullAddress",
  "AddressStr",
  "Adress",
];
const YEAR_BUILT_KEYS = [
  "year_built",
  "YearBuilt",
  "YearBuild",
  "year_build",
  "BuildYear",
  "YearConstruction",
  "Year",
];
const YEAR_OPENED_KEYS = [
  "year_opened",
  "YearOpened",
  "YearOfCommissioning",
  "OperationYear",
  "YearOperation",
];
const YEAR_START_KEYS = [
  "YearOfWork",
  "WorkYear",
  "YearStart",
  "YearOfStart",
  "RepairStartYear",
  "YearRepair",
  "StartYear",
  "PlanYear",
  "YearPlan",
  "StartDate",
  "StartDateActual",
  "ContractStartDate",
  "PlannedStartDate",
  "ActualStartDate",
];
const YEAR_END_KEYS = [
  "YearEnd",
  "YearOfEnd",
  "RepairEndYear",
  "EndYear",
  "YearRepairEnd",
  "EndDate",
  "EndDateActual",
  "ContractEndDate",
  "PlannedEndDate",
  "ActualEndDate",
];
const WORKS_KEYS = [
  "WorkName",
  "DetailedWork",
  "WorkEssence",
  "Works",
  "Work",
  "WorkList",
  "Activities",
  "RepairWorks",
  "ListOfWorks",
  "WorksList",
  "WorkType",
  "TypeOfWorks",
  "RepairType",
];
const STATUS_KEYS = [
  "Status",
  "StatusRepair",
  "RepairStatus",
  "State",
  "ContractType",
];

async function fetchAllRows(datasetId, label, checkpointName) {
  await mkdir(OUT_DIR, { recursive: true });
  const checkpointPath = path.join(OUT_DIR, `${checkpointName}.checkpoint.json`);
  const rawPath = path.join(OUT_DIR, `${checkpointName}.raw.jsonl`);

  let skip = 0;
  let totalSaved = 0;
  let resume = false;
  try {
    const rawCheckpoint = JSON.parse(await readFile(checkpointPath, "utf8"));
    const rawExists = await access(rawPath).then(() => true).catch(() => false);
    if (
      rawExists &&
      Number.isFinite(rawCheckpoint.skip) &&
      rawCheckpoint.datasetId === datasetId
    ) {
      skip = rawCheckpoint.skip;
      totalSaved = rawCheckpoint.totalSaved ?? 0;
      resume = true;
      console.log(
        `${label}: resume from skip=${skip} (already saved ~${totalSaved} rows)`,
      );
    }
  } catch {
    // fresh download
  }

  let count = null;
  try {
    const countPayload = await mosGet(`/datasets/${datasetId}/count`);
    count =
      typeof countPayload === "number"
        ? countPayload
        : Number(countPayload?.Count ?? countPayload?.count ?? NaN);
    if (Number.isFinite(count)) {
      console.log(`${label}: dataset reports ~${count} rows`);
    }
  } catch {
    // optional
  }

  const downloadComplete =
    resume &&
    Number.isFinite(count) &&
    totalSaved >= count * 0.99;

  if (!resume) {
    await writeFile(rawPath, "", "utf8");
    skip = 0;
    totalSaved = 0;
  }

  if (!downloadComplete) {
    const { appendFile } = await import("node:fs/promises");
    for (; ; skip += PAGE) {
      process.stdout.write(
        `\r${label}: skip=${skip}${count ? `/${count}` : ""}…`,
      );
      const page = await mosGet(`/datasets/${datasetId}/rows`, {
        $skip: skip,
        $top: PAGE,
      });
      if (!Array.isArray(page) || page.length === 0) break;

      const lines = page.map((row) => JSON.stringify(row)).join("\n") + "\n";
      await appendFile(rawPath, lines, "utf8");
      totalSaved += page.length;

      await writeFile(
        checkpointPath,
        JSON.stringify(
          {
            datasetId,
            skip: skip + page.length,
            totalSaved,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        "utf8",
      );

      if (page.length < PAGE) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    process.stdout.write("\n");
  } else {
    console.log(`${label}: raw dump already complete, skipping download`);
  }

  return rawPath;
}

/** Stream-compact raw JSONL → compact house records (does not load file as one string). */
async function compactHousesFromJsonl(rawPath) {
  const { createInterface } = await import("node:readline");
  const input = createReadStream(rawPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });

  const out = [];
  const seen = new Set();
  let scanned = 0;
  let withYear = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    scanned += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const cells = row.Cells ?? row.attributes ?? {};
    const address = pickAddressFromCells(cells);
    if (!address) continue;
    const yearBuilt = pickYearFromCells(cells, YEAR_BUILT_KEYS);
    const yearOpened = pickYearFromCells(cells, YEAR_OPENED_KEYS);
    const year = yearBuilt ?? yearOpened;
    if (year == null) continue;
    withYear += 1;
    const key = normalizePart(address);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      a: address,
      y: year,
      yo: yearOpened && yearOpened !== year ? yearOpened : undefined,
    });
    if (scanned % 50_000 === 0) {
      process.stdout.write(
        `\rcompact houses: scanned=${scanned}, withYear=${withYear}, unique=${out.length}…`,
      );
    }
  }
  process.stdout.write(
    `\rcompact houses: scanned=${scanned}, withYear=${withYear}, unique=${out.length}          \n`,
  );
  return out;
}

async function compactRepairsFromJsonl(rawPath) {
  const { createInterface } = await import("node:readline");
  const input = createReadStream(rawPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  const out = [];
  let scanned = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    scanned += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const cells = row.Cells ?? row.attributes ?? {};
    const address = pickAddressFromCells(cells);
    if (!address) continue;
    const start =
      pickYearFromCells(cells, YEAR_START_KEYS) ??
      pickYearFromCells(cells, ["Year", "year"]);
    const end = pickYearFromCells(cells, YEAR_END_KEYS);
    let works = cellString(cells, WORKS_KEYS) || undefined;
    if (works && works.length > 180) works = `${works.slice(0, 177)}…`;
    const status = cellString(cells, STATUS_KEYS) || undefined;
    if (start == null && end == null && !works && !status) continue;
    out.push({
      a: address,
      s: start ?? undefined,
      e: end ?? undefined,
      w: works,
      st: status,
    });
  }
  console.log(`compact repairs: scanned=${scanned}, kept=${out.length}`);
  return out;
}

async function listDatasets() {
  const all = [];
  for (let skip = 0; skip < 30_000; skip += 1000) {
    const page = await mosGet("/datasets", {
      $skip: skip,
      $top: 1000,
      foreign: "false",
    });
    if (!Array.isArray(page) || page.length === 0) break;
    for (const item of page) {
      const id = item.Id ?? 0;
      const caption = String(item.Caption ?? "").trim();
      if (id > 0 && caption) all.push({ id, caption });
    }
    if (page.length < 1000) break;
  }
  return all;
}

function scorePassport(caption) {
  const lower = caption.toLowerCase();
  let points = 0;
  // «жилищно-коммунального» ≠ паспорта жилых домов
  if (
    /жилищно-коммунальн|департамент жилищ/.test(lower) &&
    !/паспорт|база жил|год постро/.test(lower)
  ) {
    return 0;
  }
  if (/адресный реестр объектов недвижимости/.test(lower)) return 0;
  if (/база/.test(lower) && /жил/.test(lower) && /дом/.test(lower)) points += 10;
  if (/паспорт/.test(lower) && /дом|здан|жил/.test(lower)) points += 8;
  if (/многоквартир/.test(lower) || /\bмкд\b/.test(lower)) points += 5;
  if (/год/.test(lower) && /постро/.test(lower)) points += 5;
  if (/dommos|доммос/.test(lower)) points += 4;
  if (/аварийн|снес|реновац|лиценз|перепланир|зарядн|торгов|фасад|лифт/.test(lower)) {
    points -= 5;
  }
  return points;
}

function scoreRepair(caption) {
  const lower = caption.toLowerCase();
  let points = 0;
  if (/капитальн/.test(lower) && /ремонт/.test(lower)) points += 3;
  if (/региональн/.test(lower) && /программ/.test(lower)) points += 5;
  if (/краткосроч/.test(lower) && /ремонт/.test(lower)) points += 4;
  if (/график/.test(lower) && /капитальн/.test(lower)) points += 3;
  if (/многоквартир/.test(lower) || /\bмкд\b/.test(lower)) points += 2;
  if (/прием граждан|приём граждан|график приема|график приёма/.test(lower)) {
    points -= 10;
  }
  if (/специальн/.test(lower) && /счет|счёт/.test(lower)) points -= 3;
  if (/счет/.test(lower) || /счёт/.test(lower)) points -= 2;
  return points;
}

function datasetColumns(meta) {
  if (!meta || typeof meta !== "object") return [];
  if (Array.isArray(meta.Columns)) return meta.Columns;
  if (Array.isArray(meta.columns)) return meta.columns;
  return [];
}

function columnBlob(meta) {
  return datasetColumns(meta)
    .map((c) => `${c.Name ?? c.name ?? ""} ${c.Caption ?? c.caption ?? ""}`)
    .join(" | ")
    .toLowerCase();
}

function looksLikeHousePassport(meta) {
  const cols = datasetColumns(meta);
  if (cols.length === 0) return false;
  const blob = columnBlob(meta);
  const hasAddress = /address|адрес|location|улиц/.test(blob);
  const hasYear =
    /year_built|year_opened|yearbuild|year_of|buildyear|construction|постро|ввод|эксплуат|\bгод\b/.test(
      blob,
    );
  return hasAddress && hasYear;
}

function printColumns(meta, label) {
  const cols = datasetColumns(meta);
  console.log(`${label} columns (${cols.length}):`);
  for (const c of cols.slice(0, 40)) {
    const name = c.Name ?? c.name ?? "?";
    const caption = c.Caption ?? c.caption ?? "";
    console.log(`  - ${name}${caption ? ` | ${caption}` : ""}`);
  }
}

async function assertPassportHasYearColumns(datasetId) {
  const meta = await mosGet(`/datasets/${datasetId}`);
  const caption = meta?.Caption ?? meta?.caption ?? "";
  printColumns(meta, `Dataset ${datasetId}`);
  if (!looksLikeHousePassport(meta)) {
    const hint =
      datasetId === 60562
        ? " 60562 — это «Адресный реестр» без года постройки (~550k строк). Не используйте его."
        : "";
    throw new Error(
      `Датасет ${datasetId} («${caption}») не похож на паспорта домов с годом постройки.${hint}\n` +
        `Запустите: node scripts/find-moscow-year-dataset.mjs\n` +
        `Затем: export MOS_DOM_PASSPORT_DATASET_ID=<id_с_годом>`,
    );
  }
  console.log(
    `Passport dataset OK: ${datasetId} — ${caption || "(no caption)"}`,
  );
  return meta;
}

async function resolvePassportDatasetId(list) {
  const fromEnv = Number.parseInt(
    process.env.MOS_DOM_PASSPORT_DATASET_ID ?? "",
    10,
  );
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    console.log(`Passport dataset from env: ${fromEnv}`);
    await assertPassportHasYearColumns(fromEnv);
    return fromEnv;
  }

  // Do NOT auto-pick 60562: address registry without year_built (~550k rows).
  for (const id of [29171, 27707]) {
    try {
      const meta = await mosGet(`/datasets/${id}`);
      if (looksLikeHousePassport(meta)) {
        console.log(`Passport dataset (known id): ${id}`);
        return id;
      }
    } catch (error) {
      console.log(
        `Known id ${id} unavailable: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  const ranked = list
    .map((item) => ({ ...item, points: scorePassport(item.caption) }))
    .filter((item) => item.points >= 4)
    .sort((a, b) => b.points - a.points);

  console.log("Top house-like datasets by caption:");
  for (const item of ranked.slice(0, 15)) {
    console.log(`  ${item.points}\t${item.id}\t${item.caption}`);
  }

  for (const item of ranked.slice(0, 25)) {
    try {
      const meta = await mosGet(`/datasets/${item.id}`);
      if (looksLikeHousePassport(meta)) {
        console.log(`Passport dataset: ${item.id} — ${item.caption}`);
        return item.id;
      }
    } catch {
      // continue
    }
  }

  return null;
}

async function resolveRepairDatasetId(list) {
  const fromEnv = Number.parseInt(
    process.env.MOS_CAPITAL_REPAIR_DATASET_ID ?? "",
    10,
  );
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  // Prefer the known MKD capital-repair works table.
  for (const id of [62963]) {
    if (list.some((item) => item.id === id)) {
      console.log(`Repair dataset (known id): ${id}`);
      return id;
    }
  }

  const ranked = list
    .map((item) => ({ ...item, points: scoreRepair(item.caption) }))
    .filter((item) => item.points >= 3)
    .sort((a, b) => b.points - a.points);

  if (ranked[0]) {
    console.log(`Repair dataset candidate: ${ranked[0].id} — ${ranked[0].caption}`);
    return ranked[0].id;
  }
  return null;
}

function pickAddressFromCells(cells) {
  const direct = cellString(cells, ADDRESS_KEYS);
  if (direct) return direct;
  for (const [key, value] of Object.entries(cells)) {
    if (!/address|адрес|улиц|location/i.test(key)) continue;
    const text = stringifyCellValue(value);
    if (text) return text;
  }
  return "";
}

function pickYearFromCells(cells, keys) {
  const direct = parseYear(cellString(cells, keys));
  if (direct != null) return direct;
  for (const [key, value] of Object.entries(cells)) {
    if (!/year|год|built|build|постро|ввод|эксплуат|constr/i.test(key)) {
      continue;
    }
    const year = parseYear(value);
    if (year != null) return year;
  }
  return null;
}

async function sampleJsonl(rawPath, n = 3) {
  const { createInterface } = await import("node:readline");
  const input = createReadStream(rawPath, { encoding: "utf8" });
  const rl = createInterface({ input, crlfDelay: Infinity });
  const rows = [];
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      continue;
    }
    if (rows.length >= n) break;
  }
  rl.close();
  input.destroy();
  return rows;
}

async function writeJsonGz(filePath, data) {
  const tmp = `${filePath}.json`;
  await writeFile(tmp, JSON.stringify(data), "utf8");
  await pipeline(
    createReadStream(tmp),
    createGzip({ level: 9 }),
    createWriteStream(filePath),
  );
  await unlink(tmp);
}

async function main() {
  const repairsOnly =
    process.env.MOS_DOWNLOAD_MODE === "repairs-only" ||
    process.env.MOS_DOWNLOAD_REPAIRS_ONLY === "1";

  console.log("Checking API key…");
  const probe = await mosGet("/datasets", { $top: 1, foreign: "false" });
  if (!Array.isArray(probe)) {
    throw new Error(
      `Неожиданный ответ /datasets (тип ${typeof probe}). Проверьте ключ. Пример: ${JSON.stringify(probe).slice(0, 200)}`,
    );
  }
  if (probe.length === 0) {
    throw new Error("API вернул пустой список датасетов — проверьте ключ.");
  }
  console.log(`API OK (пример набора: ${probe[0]?.Caption ?? probe[0]?.Id})`);

  console.log("Listing datasets (may take a minute)…");
  const list = await listDatasets();
  console.log(`Datasets in catalog: ${list.length}`);

  let passportId = null;
  if (!repairsOnly) {
    passportId = await resolvePassportDatasetId(list);
    if (!passportId) {
      await mkdir(OUT_DIR, { recursive: true });
      const candidates = list
        .map((item) => ({ ...item, points: scorePassport(item.caption) }))
        .filter((item) => item.points >= 1)
        .sort((a, b) => b.points - a.points)
        .slice(0, 40);
      const candidatesPath = path.join(OUT_DIR, "dataset-candidates.json");
      await writeFile(
        candidatesPath,
        JSON.stringify(candidates, null, 2),
        "utf8",
      );
      console.error(`\nСписок кандидатов сохранён: ${candidatesPath}`);
      console.error(
        "В открытом каталоге нет набора «адрес + год постройки» существующих МКД.",
      );
      console.error(
        "Для капремонта можно качать отдельно:\n  export MOS_DOWNLOAD_MODE=repairs-only\n  export MOS_CAPITAL_REPAIR_DATASET_ID=62963\n  npm run moscow:download",
      );
      throw new Error(
        "Не найден датасет паспортов домов. Задайте MOS_DOWNLOAD_MODE=repairs-only или другой источник года.",
      );
    }
  } else {
    console.log("Mode: repairs-only (год постройки не качаем из mos.ru)");
  }

  const repairId = await resolveRepairDatasetId(list);
  if (!repairId) {
    if (repairsOnly) {
      throw new Error(
        "Датасет капремонта не найден. Задайте MOS_CAPITAL_REPAIR_DATASET_ID=62963",
      );
    }
    console.warn(
      "Датасет капремонта не найден автоматически — houses всё равно скачаем. Задайте MOS_CAPITAL_REPAIR_DATASET_ID при необходимости.",
    );
  }

  await mkdir(OUT_DIR, { recursive: true });

  const metaPath = path.join(OUT_DIR, "meta.json");
  let houses = [];

  if (passportId) {
    if (!process.env.MOS_DOM_PASSPORT_DATASET_ID) {
      await assertPassportHasYearColumns(passportId);
    }
    const housesRawPath = await fetchAllRows(passportId, "houses", "houses");
    console.log(`${housesRawPath}: compacting (stream)…`);
    houses = await compactHousesFromJsonl(housesRawPath);
    if (houses.length === 0) {
      throw new Error(
        "После компакта 0 домов с годом. Скорее всего выбран датасет без year_built " +
          "(например 60562 или 2941 — объекты нового строительства). Удалите houses.raw.jsonl / houses.checkpoint.json.",
      );
    }
    const housesPath = path.join(OUT_DIR, "houses.min.json.gz");
    await writeJsonGz(housesPath, {
      v: 1,
      kind: "moscow_houses",
      datasetId: passportId,
      downloadedAt: new Date().toISOString(),
      count: houses.length,
      houses,
    });
    console.log(`Wrote ${housesPath} (${houses.length} houses with year)`);

    await writeFile(
      path.join(OUT_DIR, "houses.sample.json"),
      JSON.stringify(await sampleJsonl(housesRawPath, 3), null, 2),
      "utf8",
    );
  }

  let repairs = [];
  if (repairId) {
    console.log(`Repair dataset id: ${repairId}`);
    const repairsRawPath = await fetchAllRows(repairId, "repairs", "repairs");
    console.log(`${repairsRawPath}: compacting (stream)…`);
    repairs = await compactRepairsFromJsonl(repairsRawPath);
    if (repairs.length === 0) {
      throw new Error(
        "После компакта 0 строк капремонта. Проверьте ObjectAddress / WorkName в repairs.sample.json",
      );
    }
    const repairsPath = path.join(OUT_DIR, "repairs.min.json.gz");
    await writeJsonGz(repairsPath, {
      v: 1,
      kind: "moscow_capital_repair",
      datasetId: repairId,
      downloadedAt: new Date().toISOString(),
      count: repairs.length,
      repairs,
    });
    console.log(`Wrote ${repairsPath} (${repairs.length} repair rows)`);
    await writeFile(
      path.join(OUT_DIR, "repairs.sample.json"),
      JSON.stringify(await sampleJsonl(repairsRawPath, 3), null, 2),
      "utf8",
    );
  }

  const meta = {
    downloadedAt: new Date().toISOString(),
    mode: repairsOnly ? "repairs-only" : "houses+repairs",
    passportDatasetId: passportId,
    repairDatasetId: repairId,
    housesWithYear: houses.length,
    repairRows: repairs.length,
    files: {
      houses: passportId ? "houses.min.json.gz" : null,
      repairs: repairId ? "repairs.min.json.gz" : null,
    },
    note:
      passportId == null
        ? "Year of construction for existing MKD is not in mos.ru open catalog; use Housescore/OSM/etc. Cap repair from 62963."
        : undefined,
  };
  await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log(`Wrote ${metaPath}`);
  console.log("\nГотово. Пришлите папку data/moscow/ (или сделайте PR/commit).");
}

main().catch((error) => {
  console.error("\nDownload failed:", error);
  process.exit(1);
});
