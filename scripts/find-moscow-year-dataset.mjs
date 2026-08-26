#!/usr/bin/env node
/**
 * Find Moscow open-data datasets that look like house passports (address + year).
 *
 *   export MOS_DATA_API_KEY='...'
 *   node scripts/find-moscow-year-dataset.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://apidata.mos.ru/v1";
const OUT_DIR = "data/moscow";

function apiKey() {
  const key = process.env.MOS_DATA_API_KEY?.trim();
  if (!key) {
    console.error("Set MOS_DATA_API_KEY");
    process.exit(1);
  }
  return key;
}

function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (data?.Items) return data.Items;
  if (data?.items) return data.items;
  if (data?.value) return data.value;
  return data;
}

async function mosGet(pathname, search = {}) {
  const url = new URL(`${BASE}${pathname}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("$format", "json");
  for (const [k, v] of Object.entries(search)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${pathname}: ${text.slice(0, 200)}`);
  return unwrap(JSON.parse(text));
}

function score(caption = "", idNum = "", keywords = "") {
  const blob = `${caption} ${idNum} ${keywords}`.toLowerCase();
  let points = 0;
  if (/база/.test(blob) && /жил/.test(blob) && /дом/.test(blob)) points += 10;
  if (/паспорт/.test(blob) && /(жил|дом|здан|мкд)/.test(blob)) points += 9;
  if (/год/.test(blob) && /постро/.test(blob)) points += 8;
  if (/dommos|доммос/.test(blob)) points += 8;
  if (/многоквартир|\bмкд\b/.test(blob)) points += 4;
  if (/адресный реестр объектов недвижимости/.test(blob)) points -= 20;
  if (/жилищно-коммунальн/.test(blob) && !/паспорт|постро/.test(blob)) points -= 10;
  if (/прием граждан|лиценз|зарядн|торгов/.test(blob)) points -= 10;
  return points;
}

function colsBlob(meta) {
  const cols = meta?.Columns ?? meta?.columns ?? [];
  return cols
    .map((c) => `${c.Name ?? c.name ?? ""} ${c.Caption ?? c.caption ?? ""}`)
    .join(" | ")
    .toLowerCase();
}

async function main() {
  console.log("Listing datasets…");
  const all = [];
  for (let skip = 0; skip < 30_000; skip += 1000) {
    const page = await mosGet("/datasets", {
      $skip: skip,
      $top: 1000,
      foreign: "false",
    });
    if (!Array.isArray(page) || page.length === 0) break;
    for (const item of page) {
      all.push({
        id: item.Id,
        caption: item.Caption ?? "",
        idNum: item.IdentificationNumber ?? "",
        keywords: item.Keywords ?? "",
        points: score(
          item.Caption ?? "",
          item.IdentificationNumber ?? "",
          item.Keywords ?? "",
        ),
      });
    }
    if (page.length < 1000) break;
  }
  console.log(`Catalog: ${all.length}`);

  const ranked = all
    .filter((x) => x.points >= 4)
    .sort((a, b) => b.points - a.points);

  console.log("\nCaption candidates:");
  for (const item of ranked.slice(0, 30)) {
    console.log(`  ${item.points}\t${item.id}\t${item.caption}`);
  }

  const hits = [];
  const toProbe = ranked.slice(0, 40);
  // Always probe a few known / related ids if present
  for (const id of [60562, 62963]) {
    if (!toProbe.some((x) => x.id === id)) {
      const found = all.find((x) => x.id === id);
      if (found) toProbe.push(found);
    }
  }

  console.log("\nProbing columns (address + year)…");
  for (const item of toProbe) {
    try {
      const meta = await mosGet(`/datasets/${item.id}`);
      const blob = colsBlob(meta);
      const hasAddress = /address|адрес/.test(blob);
      const hasYear =
        /year_built|year_opened|yearbuild|buildyear|постро|ввод в эксплуат|год постро/.test(
          blob,
        );
      const colNames = (meta?.Columns ?? meta?.columns ?? [])
        .map((c) => c.Name ?? c.name)
        .filter(Boolean)
        .slice(0, 20);
      const ok = hasAddress && hasYear;
      console.log(
        `${ok ? "OK " : "—  "} ${item.id}  addr=${hasAddress} year=${hasYear}  ${item.caption}`,
      );
      if (ok) {
        hits.push({
          id: item.id,
          caption: item.caption,
          columns: colNames,
        });
      }
      await new Promise((r) => setTimeout(r, 120));
    } catch (error) {
      console.log(
        `ERR ${item.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = `${OUT_DIR}/year-dataset-hits.json`;
  await writeFile(outPath, JSON.stringify({ hits, ranked: ranked.slice(0, 50) }, null, 2));
  console.log(`\nWrote ${outPath}`);
  if (hits.length === 0) {
    console.log(
      "\nНе найдено наборов с адресом+годом в колонках. Ищите на data.mos.ru вручную «паспорт» / «год постройки».",
    );
  } else {
    console.log("\nИспользуйте лучший id:");
    console.log(`  export MOS_DOM_PASSPORT_DATASET_ID=${hits[0].id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
