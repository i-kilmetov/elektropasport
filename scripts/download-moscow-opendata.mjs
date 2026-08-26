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
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import path from "node:path";

const BASE = "https://apidata.mos.ru/v1";
const PAGE = 1000;
const OUT_DIR = process.env.MOS_DATA_OUT_DIR?.trim() || "data/moscow";

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
  for (const [k, v] of Object.entries(search)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${pathname}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function cellString(cells, keys) {
  if (!cells || typeof cells !== "object") return "";
  for (const key of keys) {
    const direct = cells[key];
    if (direct != null && String(direct).trim()) return String(direct).trim();
  }
  const lower = new Map(
    Object.entries(cells).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const value = lower.get(key.toLowerCase());
    if (value != null && String(value).trim()) return String(value).trim();
  }
  // caption-like fallback: any key containing address / year / work
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
  "YearStart",
  "YearOfStart",
  "RepairStartYear",
  "YearRepair",
  "StartYear",
  "PlanYear",
  "YearPlan",
];
const YEAR_END_KEYS = [
  "YearEnd",
  "YearOfEnd",
  "RepairEndYear",
  "EndYear",
  "YearRepairEnd",
];
const WORKS_KEYS = [
  "Works",
  "WorkList",
  "Activities",
  "RepairWorks",
  "ListOfWorks",
  "WorksList",
  "WorkType",
  "TypeOfWorks",
  "RepairType",
];
const STATUS_KEYS = ["Status", "StatusRepair", "RepairStatus", "State"];

async function fetchAllRows(datasetId, label) {
  const rows = [];
  for (let skip = 0; ; skip += PAGE) {
    process.stdout.write(`\r${label}: skip=${skip}…`);
    const page = await mosGet(`/datasets/${datasetId}/rows`, {
      $skip: skip,
      $top: PAGE,
    });
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < PAGE) break;
    // gentle pacing
    await new Promise((r) => setTimeout(r, 150));
  }
  process.stdout.write(`\r${label}: ${rows.length} rows          \n`);
  return rows;
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
  if (/база/.test(lower) && /жил/.test(lower) && /дом/.test(lower)) points += 8;
  if (/паспорт/.test(lower) && /жил/.test(lower)) points += 5;
  if (/мкд/.test(lower) || /многоквартир/.test(lower)) points += 2;
  if (/dommos/.test(lower)) points += 2;
  return points;
}

function scoreRepair(caption) {
  const lower = caption.toLowerCase();
  let points = 0;
  if (/капитальн/.test(lower) && /ремонт/.test(lower)) points += 3;
  if (/региональн/.test(lower) && /программ/.test(lower)) points += 4;
  if (/график/.test(lower) || /краткосроч/.test(lower)) points += 2;
  if (/многоквартир/.test(lower) || /\bмкд\b/.test(lower)) points += 2;
  if (/счет/.test(lower) || /счёт/.test(lower)) points -= 2;
  return points;
}

async function resolvePassportDatasetId(list) {
  const fromEnv = Number.parseInt(
    process.env.MOS_DOM_PASSPORT_DATASET_ID ?? "",
    10,
  );
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  for (const id of [60562, 29171, 27707]) {
    try {
      const meta = await mosGet(`/datasets/${id}`);
      const cols = meta?.Columns ?? [];
      const hasAddress = cols.some((c) =>
        /address|адрес/i.test(`${c.Name ?? ""} ${c.Caption ?? ""}`),
      );
      const hasYear = cols.some((c) =>
        /year_built|год постро/i.test(`${c.Name ?? ""} ${c.Caption ?? ""}`),
      );
      if (hasAddress && hasYear) {
        console.log(`Passport dataset (known id): ${id}`);
        return id;
      }
    } catch {
      // try next
    }
  }

  const ranked = list
    .map((item) => ({ ...item, points: scorePassport(item.caption) }))
    .filter((item) => item.points >= 5)
    .sort((a, b) => b.points - a.points);

  for (const item of ranked.slice(0, 8)) {
    try {
      const meta = await mosGet(`/datasets/${item.id}`);
      const cols = meta?.Columns ?? [];
      const hasAddress = cols.some((c) =>
        /address|адрес/i.test(`${c.Name ?? ""} ${c.Caption ?? ""}`),
      );
      const hasYear = cols.some((c) =>
        /year_built|год постро/i.test(`${c.Name ?? ""} ${c.Caption ?? ""}`),
      );
      if (hasAddress && hasYear) {
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

function compactHouses(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const cells = row.Cells ?? row.attributes ?? {};
    const address = cellString(cells, ADDRESS_KEYS);
    if (!address) continue;
    const yearBuilt = parseYear(cellString(cells, YEAR_BUILT_KEYS));
    const yearOpened = parseYear(cellString(cells, YEAR_OPENED_KEYS));
    const year = yearBuilt ?? yearOpened;
    if (year == null) continue;
    const key = normalizePart(address);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      a: address,
      y: year,
      yo: yearOpened && yearOpened !== year ? yearOpened : undefined,
    });
  }
  return out;
}

function compactRepairs(rows) {
  const out = [];
  for (const row of rows) {
    const cells = row.Cells ?? row.attributes ?? {};
    const address = cellString(cells, ADDRESS_KEYS);
    if (!address) continue;
    const start =
      parseYear(cellString(cells, YEAR_START_KEYS)) ??
      parseYear(cellString(cells, ["Year", "year"]));
    const end = parseYear(cellString(cells, YEAR_END_KEYS));
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
  return out;
}

async function writeJsonGz(filePath, data) {
  const tmp = `${filePath}.json`;
  await writeFile(tmp, JSON.stringify(data), "utf8");
  await pipeline(
    (await import("node:fs")).createReadStream(tmp),
    createGzip({ level: 9 }),
    createWriteStream(filePath),
  );
  const { unlink } = await import("node:fs/promises");
  await unlink(tmp);
}

async function main() {
  console.log("Checking API key…");
  const probe = await mosGet("/datasets", { $top: 1, foreign: "false" });
  if (!Array.isArray(probe)) {
    throw new Error("Unexpected /datasets response — check API key");
  }
  console.log("API OK");

  console.log("Listing datasets (may take a minute)…");
  const list = await listDatasets();
  console.log(`Datasets in catalog: ${list.length}`);

  const passportId = await resolvePassportDatasetId(list);
  if (!passportId) {
    throw new Error(
      "Не найден датасет паспортов домов. Задайте MOS_DOM_PASSPORT_DATASET_ID.",
    );
  }

  const repairId = await resolveRepairDatasetId(list);
  if (!repairId) {
    console.warn(
      "Датасет капремонта не найден автоматически — houses всё равно скачаем. Задайте MOS_CAPITAL_REPAIR_DATASET_ID при необходимости.",
    );
  }

  await mkdir(OUT_DIR, { recursive: true });

  const metaPath = path.join(OUT_DIR, "meta.json");
  const passportRows = await fetchAllRows(passportId, "houses");
  const houses = compactHouses(passportRows);
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

  // keep a small raw sample for debugging columns
  await writeFile(
    path.join(OUT_DIR, "houses.sample.json"),
    JSON.stringify(passportRows.slice(0, 3), null, 2),
    "utf8",
  );

  let repairs = [];
  if (repairId) {
    const repairRows = await fetchAllRows(repairId, "repairs");
    repairs = compactRepairs(repairRows);
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
      JSON.stringify(repairRows.slice(0, 3), null, 2),
      "utf8",
    );
  }

  const meta = {
    downloadedAt: new Date().toISOString(),
    passportDatasetId: passportId,
    repairDatasetId: repairId,
    housesWithYear: houses.length,
    repairRows: repairs.length,
    files: {
      houses: "houses.min.json.gz",
      repairs: repairId ? "repairs.min.json.gz" : null,
    },
  };
  await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log(`Wrote ${metaPath}`);
  console.log("\nГотово. Пришлите папку data/moscow/ (или сделайте PR/commit).");
}

main().catch((error) => {
  console.error("\nDownload failed:", error);
  process.exit(1);
});
