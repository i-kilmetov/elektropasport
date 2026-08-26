#!/usr/bin/env node
/**
 * Find Moscow open-data datasets for:
 *   A) house address + year of construction / commissioning
 *   B) capital repair (address + years + work type)
 *
 *   export MOS_DATA_API_KEY='...'
 *   npm run moscow:find
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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${pathname}: ${text.slice(0, 200)}`);
  }
  return unwrap(JSON.parse(text));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function colsList(meta) {
  return meta?.Columns ?? meta?.columns ?? [];
}

function colsBlob(meta) {
  return colsList(meta)
    .map((c) => `${c.Name ?? c.name ?? ""} ${c.Caption ?? c.caption ?? ""}`)
    .join(" | ")
    .toLowerCase();
}

function colSummary(meta, limit = 40) {
  return colsList(meta)
    .map((c) => {
      const name = c.Name ?? c.name ?? "?";
      const caption = c.Caption ?? c.caption ?? "";
      return caption ? `${name} (${caption})` : name;
    })
    .slice(0, limit);
}

const YEAR_COL_RE =
  /year_built|year_opened|yearbuild|buildyear|year_of_build|yearconstruction|постро|год\s*постро|ввод.*эксплуат|эксплуат.*год|год\s*ввод|дата\s*постро|дата\s*ввод/;

const ADDRESS_COL_RE = /address|адрес|location|улиц|unom|fias/;

const REPAIR_YEAR_COL_RE =
  /year|год|period|period|срок|план|факт|start|end|begin|finish|date|дат/;

const REPAIR_WORK_COL_RE =
  /work|работ|вид|наимен|тип\s*ремонт|инженер|сеть|электро|систем/;

function captionLooksLikeYearSource(caption = "", keywords = "") {
  const blob = `${caption} ${keywords}`.toLowerCase();
  if (/адресный реестр объектов недвижимости/.test(blob)) return false;
  if (/колористическ|рейтинг управляющ|лиценз|зарядн|торгов|прием граждан/.test(blob)) {
    return false;
  }
  return (
    (/год/.test(blob) && /постро|ввод|эксплуат/.test(blob)) ||
    (/паспорт/.test(blob) && /жил|мкд|дом|здан/.test(blob) && !/квартир|фасад|колор/.test(blob)) ||
    (/база|реестр|характеристи|сведен/.test(blob) &&
      /жил/.test(blob) &&
      /дом|мкд|фонда/.test(blob)) ||
    /dommos|доммос/.test(blob) ||
    (/техническ/.test(blob) && /характерист/.test(blob) && /дом|мкд|жил/.test(blob))
  );
}

function captionLooksLikeRepair(caption = "") {
  const lower = caption.toLowerCase();
  if (/специальн.*счет|рейтинг|лиценз|прием граждан/.test(lower)) return false;
  return (
    (/капитальн/.test(lower) && /ремонт/.test(lower)) ||
    (/региональн/.test(lower) && /программ/.test(lower) && /ремонт/.test(lower)) ||
    (/работ/.test(lower) && /капитальн/.test(lower))
  );
}

function extractYearsFromCells(cells) {
  const found = [];
  for (const [key, value] of Object.entries(cells ?? {})) {
    const blob = `${key} ${typeof value === "object" ? JSON.stringify(value) : value}`;
    const matches = String(blob).match(/\b(18|19|20)\d{2}\b/g) ?? [];
    for (const m of matches) {
      const y = Number(m);
      if (y >= 1800 && y <= 2035) found.push({ key, year: y });
    }
  }
  return found;
}

async function probeDataset(item, kind) {
  const meta = await mosGet(`/datasets/${item.id}`);
  const blob = colsBlob(meta);
  const columns = colSummary(meta);
  const hasAddress = ADDRESS_COL_RE.test(blob);
  const hasBuildYear = YEAR_COL_RE.test(blob);
  const hasRepairYear = REPAIR_YEAR_COL_RE.test(blob);
  const hasRepairWork = REPAIR_WORK_COL_RE.test(blob);

  let sampleYears = [];
  let sampleAddress = "";
  let sampleWork = "";
  try {
    const rows = await mosGet(`/datasets/${item.id}/rows`, { $top: 2, $skip: 0 });
    const row = Array.isArray(rows) ? rows[0] : null;
    const cells = row?.Cells ?? row?.attributes ?? {};
    sampleYears = extractYearsFromCells(cells).slice(0, 12);
    for (const [k, v] of Object.entries(cells)) {
      if (/address|адрес/i.test(k) && v && !sampleAddress) {
        sampleAddress = String(v).slice(0, 120);
      }
      if (/work|работ|наимен|вид/i.test(k) && v && !sampleWork) {
        sampleWork = String(v).slice(0, 120);
      }
    }
  } catch {
    // optional
  }

  const yearInSample = sampleYears.some((x) =>
    /built|постро|ввод|эксплуат|открыт|opened|construction/i.test(x.key),
  );

  return {
    id: item.id,
    caption: item.caption,
    kind,
    hasAddress,
    hasBuildYear,
    hasRepairYear,
    hasRepairWork,
    yearInSample,
    columns,
    sampleAddress,
    sampleWork,
    sampleYears,
    okHouse: hasAddress && (hasBuildYear || yearInSample),
    okRepair:
      hasAddress &&
      (hasRepairYear || sampleYears.length > 0) &&
      (hasRepairWork || Boolean(sampleWork)),
  };
}

async function main() {
  console.log("Listing full catalog…");
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
        caption: String(item.Caption ?? "").trim(),
        keywords: String(item.Keywords ?? ""),
      });
    }
    if (page.length < 1000) break;
  }
  console.log(`Catalog: ${all.length}`);

  // A) captions that might be house+year (full catalog, not top-N score junk)
  const yearCaptionHits = all.filter((x) =>
    captionLooksLikeYearSource(x.caption, x.keywords),
  );
  console.log(`\nCaption hits for house/year-like sets: ${yearCaptionHits.length}`);
  for (const item of yearCaptionHits.slice(0, 40)) {
    console.log(`  ${item.id}\t${item.caption}`);
  }

  // Also list ANY caption containing «год» + relevant words (debug)
  const yearWordHits = all.filter((x) => {
    const b = `${x.caption} ${x.keywords}`.toLowerCase();
    return /год/.test(b) && /постро|ввод|эксплуат|строен|здан/.test(b);
  });
  console.log(`\nCaptions with «год»+build words: ${yearWordHits.length}`);
  for (const item of yearWordHits.slice(0, 40)) {
    console.log(`  ${item.id}\t${item.caption}`);
  }

  const repairCaptionHits = all.filter((x) => captionLooksLikeRepair(x.caption));
  console.log(`\nCaption hits for capital-repair-like sets: ${repairCaptionHits.length}`);
  for (const item of repairCaptionHits.slice(0, 30)) {
    console.log(`  ${item.id}\t${item.caption}`);
  }

  const toProbe = new Map();
  for (const item of [...yearCaptionHits, ...yearWordHits].slice(0, 60)) {
    toProbe.set(item.id, { ...item, kind: "house" });
  }
  for (const item of repairCaptionHits.slice(0, 25)) {
    if (!toProbe.has(item.id)) toProbe.set(item.id, { ...item, kind: "repair" });
    else toProbe.get(item.id).kind = "both";
  }
  // Always include these for clarity
  for (const id of [60562, 62963, 29171, 27707, 3293, 1537, 2387, 2941]) {
    const found = all.find((x) => x.id === id);
    if (found && !toProbe.has(id)) {
      toProbe.set(id, {
        ...found,
        kind: id === 62963 || id === 3293 || id === 1537 ? "repair" : "check",
      });
    }
  }

  console.log(`\nProbing columns + sample rows (${toProbe.size} datasets)…`);
  const probed = [];
  for (const item of toProbe.values()) {
    try {
      const result = await probeDataset(item, item.kind);
      probed.push(result);
      const mark = result.okHouse ? "HOUSE" : result.okRepair ? "REPAIR" : "—";
      console.log(
        `${mark.padEnd(6)} ${result.id}  addr=${result.hasAddress} buildYearCol=${result.hasBuildYear} yearInSample=${result.yearInSample}  ${result.caption}`,
      );
      if (result.okHouse || result.okRepair) {
        console.log(`         cols: ${result.columns.slice(0, 12).join(" | ")}`);
        if (result.sampleAddress) console.log(`         sample addr: ${result.sampleAddress}`);
        if (result.sampleWork) console.log(`         sample work: ${result.sampleWork}`);
        if (result.sampleYears.length) {
          console.log(
            `         sample years: ${result.sampleYears
              .map((y) => `${y.key}=${y.year}`)
              .join(", ")}`,
          );
        }
      }
      await sleep(150);
    } catch (error) {
      console.log(
        `ERR    ${item.id}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  const houseHits = probed.filter((p) => p.okHouse);
  const repairHits = probed.filter((p) => p.okRepair);

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = `${OUT_DIR}/year-dataset-hits.json`;
  await writeFile(
    outPath,
    JSON.stringify(
      {
        catalogSize: all.length,
        yearCaptionHits,
        yearWordHits,
        repairCaptionHits,
        houseHits,
        repairHits,
        probed,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`\nWrote ${outPath}`);

  console.log("\n========== ИТОГ ==========");
  if (houseHits.length === 0) {
    console.log(
      "Год постройки: в открытом каталоге mos.ru подходящего набора НЕ найдено.",
    );
    console.log(
      "Не качайте 60562 ради года — там только адреса. Дальше: Housescore / Реформа ЖКХ / OSM, либо ручной поиск на data.mos.ru.",
    );
  } else {
    console.log("Год постройки — кандидаты:");
    for (const h of houseHits) {
      console.log(`  export MOS_DOM_PASSPORT_DATASET_ID=${h.id}  # ${h.caption}`);
    }
  }

  if (repairHits.length === 0) {
    console.log("Капремонт: явных кандидатов с адресом+годами/работами не видно.");
  } else {
    console.log("Капремонт — кандидаты:");
    for (const h of repairHits) {
      console.log(`  export MOS_CAPITAL_REPAIR_DATASET_ID=${h.id}  # ${h.caption}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
