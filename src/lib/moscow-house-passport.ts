import {
  addressesLikelyMatch,
  buildMoscowAddressKey,
  cellString,
  pickAddressSearchTokens,
  pickMoscowApiSearchTokens,
  scoreMoscowAddressMatch,
  type MoscowAddressKey,
  MOSCOW_ADDRESS_CELL_KEYS,
} from "@/lib/moscow-address-match";
import type { AddressSuggestion } from "@/lib/dadata";
import {
  buildMoscowCellsFilter,
  fetchDatasetColumns,
  fetchDatasetRows,
  isMoscowOpenDataConfigured,
  mosFetchDatasetList,
  probeMoscowOpenDataApi,
  resolveCapitalRepairDatasetId,
  type MosDataRow,
} from "@/lib/moscow-open-data";

export type MoscowLookupDebug = {
  configured: boolean;
  apiProbe?: { ok: boolean; status: number; error?: string };
  datasetId?: number | null;
  status:
    | "ok"
    | "not_configured"
    | "api_unreachable"
    | "no_dataset"
    | "no_match"
    | "error";
  detail?: string;
};

export type MoscowAddressHit = {
  address: string;
  buildingYear: number | null;
};

export type MoscowHousePassport = {
  address: string;
  buildingYear: number | null;
  operationYear: number | null;
  sourceLabel: string;
};

const YEAR_KEYS = [
  "year_built",
  "YearBuilt",
  "YearBuild",
  "year_build",
  "Year_of_build",
  "BuildYear",
  "YearConstruction",
  "Year",
];

const OPERATION_YEAR_KEYS = [
  "year_opened",
  "YearOpened",
  "YearOfCommissioning",
  "OperationYear",
  "YearOperation",
];

let cachedPassportDatasetId: number | null | undefined;

function parseYear(raw: string): number | null {
  const match = /(19|20)\d{2}/.exec(raw);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function scorePassportDataset(caption: string): number {
  const lower = caption.toLowerCase();
  let points = 0;
  if (/база/.test(lower) && /жил/.test(lower) && /дом/.test(lower)) points += 8;
  if (/паспорт/.test(lower) && /жил/.test(lower)) points += 5;
  if (/мкд/.test(lower) || /многоквартир/.test(lower)) points += 2;
  if (/dommos/.test(lower)) points += 2;
  return points;
}

function resolveAddressColumn(
  columns: Array<{ name: string; caption: string }>,
): string | undefined {
  return columns.find((col) =>
    MOSCOW_ADDRESS_CELL_KEYS.some(
      (key) =>
        col.name.toLowerCase() === key.toLowerCase() ||
        col.caption.toLowerCase().includes("адрес"),
    ),
  )?.name;
}

/** Known dommos / MKD passport tables on apidata.mos.ru (probed before full catalog scan). */
const KNOWN_PASSPORT_DATASET_IDS = [60562, 29171, 27707];

function hasDommosYearColumn(
  columns: Array<{ name: string; caption: string }>,
): boolean {
  return columns.some((col) => {
    const name = col.name.toLowerCase();
    const caption = col.caption.toLowerCase();
    return (
      name === "year_built" ||
      name.includes("year_built") ||
      caption.includes("год постройки") ||
      caption.includes("год постро")
    );
  });
}

async function datasetHasPassportShape(datasetId: number): Promise<boolean> {
  const columns = await fetchDatasetColumns(datasetId);
  if (columns.length === 0) return false;
  const addressColumn = resolveAddressColumn(columns);
  return Boolean(addressColumn && hasDommosYearColumn(columns));
}

async function resolvePassportDatasetId(): Promise<number | null> {
  const fromEnv = Number.parseInt(
    process.env.MOS_DOM_PASSPORT_DATASET_ID ?? "",
    10,
  );
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    if (await datasetHasPassportShape(fromEnv)) return fromEnv;
  }

  if (cachedPassportDatasetId !== undefined) return cachedPassportDatasetId;

  for (const datasetId of KNOWN_PASSPORT_DATASET_IDS) {
    if (await datasetHasPassportShape(datasetId)) {
      cachedPassportDatasetId = datasetId;
      console.info("Moscow dom passport dataset (known id):", datasetId);
      return datasetId;
    }
  }

  const list = await mosFetchDatasetList();
  if (!list) {
    cachedPassportDatasetId = null;
    return null;
  }

  const candidates = list
    .map((item) => ({ ...item, points: scorePassportDataset(item.caption) }))
    .filter((item) => item.points >= 5)
    .sort((a, b) => b.points - a.points);

  for (const candidate of candidates) {
    if (await datasetHasPassportShape(candidate.id)) {
      cachedPassportDatasetId = candidate.id;
      console.info(
        "Moscow dom passport dataset:",
        candidate.id,
        candidate.caption.slice(0, 80),
      );
      return candidate.id;
    }
  }

  cachedPassportDatasetId = null;
  return null;
}

function pickBestPassportRow(
  rows: MosDataRow[],
  queryKey: MoscowAddressKey,
): MosDataRow | null {
  let best: { row: MosDataRow; score: number } | null = null;

  for (const row of rows) {
    const stored = cellString(row.Cells ?? {}, MOSCOW_ADDRESS_CELL_KEYS);
    if (!stored) continue;
    const score = scoreMoscowAddressMatch(stored, queryKey);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { row, score };
    }
  }

  return best?.row ?? null;
}

async function findPassportRow(
  datasetId: number,
  address: string,
  hints?: { street?: string | null; house?: string | null; block?: string | null },
): Promise<MosDataRow | null> {
  const queryKey = buildMoscowAddressKey({
    address,
    street: hints?.street,
    house: hints?.house,
    block: hints?.block,
  });
  if (!queryKey) return null;

  const columns = await fetchDatasetColumns(datasetId);
  const addressColumn = resolveAddressColumn(columns);
  const candidates: MosDataRow[] = [];
  const seenRows = new Set<number>();

  const collect = (rows: MosDataRow[]) => {
    for (const row of rows) {
      const id = row.global_id ?? row.Number;
      if (id != null && seenRows.has(id)) continue;
      if (id != null) seenRows.add(id);
      candidates.push(row);
    }
  };

  if (addressColumn) {
    const seenTokens = new Set<string>();
    const apiTokens: string[] = [];
    for (const token of [
      ...pickMoscowApiSearchTokens(queryKey),
      ...pickAddressSearchTokens(address, queryKey),
    ]) {
      const trimmed = token.trim();
      if (trimmed.length < 2 || seenTokens.has(trimmed)) continue;
      seenTokens.add(trimmed);
      apiTokens.push(trimmed);
    }

    for (let i = 0; i < apiTokens.length; i += 3) {
      const batch = apiTokens.slice(i, i + 3);
      const batches = await Promise.all(
        batch.map((token) =>
          fetchDatasetRows(datasetId, {
            top: 120,
            filter: buildMoscowCellsFilter(addressColumn, token),
          }),
        ),
      );
      for (const filtered of batches) {
        collect(filtered);
      }
      const best = pickBestPassportRow(candidates, queryKey);
      if (best) return best;
    }
  }

  return pickBestPassportRow(candidates, queryKey);
}

function rowMatchesQuery(
  storedAddress: string,
  query: string,
  queryKey?: MoscowAddressKey | null,
): boolean {
  if (queryKey && scoreMoscowAddressMatch(storedAddress, queryKey) >= 40) {
    return true;
  }
  return addressesLikelyMatch(storedAddress, query);
}

async function searchPassportRows(
  datasetId: number,
  query: string,
  limit: number,
): Promise<MosDataRow[]> {
  const queryKey = buildMoscowAddressKey({ address: query });
  const columns = await fetchDatasetColumns(datasetId);
  const addressColumn = resolveAddressColumn(columns);
  const searchTokens = pickAddressSearchTokens(query, queryKey);
  const results: MosDataRow[] = [];
  const seen = new Set<string>();

  const collect = (rows: MosDataRow[]) => {
    for (const row of rows) {
      if (results.length >= limit) break;
      const addr = cellString(row.Cells ?? {}, MOSCOW_ADDRESS_CELL_KEYS);
      if (!addr || seen.has(addr)) continue;
      if (!rowMatchesQuery(addr, query, queryKey)) continue;
      seen.add(addr);
      results.push(row);
    }
  };

  if (addressColumn) {
    for (const token of searchTokens) {
      if (results.length >= limit) break;
      const filtered = await fetchDatasetRows(datasetId, {
        top: Math.min(80, limit * 5),
        filter: buildMoscowCellsFilter(addressColumn, token),
      });
      collect(filtered);
    }
  }

  return results;
}

/** Address + year suggestions from Moscow dommos / MKD open data. */
export async function searchMoscowAddressSuggestions(
  query: string,
  limit = 15,
): Promise<MoscowAddressHit[]> {
  if (!isMoscowOpenDataConfigured()) return [];
  const q = query.trim();
  if (q.length < 3) return [];

  const datasetId = await resolvePassportDatasetId();
  if (!datasetId) return [];

  try {
    const rows = await searchPassportRows(datasetId, q, limit);
    return rows
      .map(rowToHit)
      .filter((hit): hit is MoscowAddressHit => hit != null);
  } catch (error) {
    console.error("Moscow address suggest failed", error);
    return [];
  }
}

export function mapMoscowHitsToSuggestions(
  hits: MoscowAddressHit[],
): AddressSuggestion[] {
  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];

  for (const hit of hits) {
    const value = hit.address.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    const houseMatch =
      /(?:д\.?|дом)\s*([\d/a-zа-я-]+)/i.exec(value) ??
      /,\s*([\d/a-zа-я-]+)\s*$/.exec(value);

    suggestions.push({
      value,
      unrestrictedValue: value,
      fiasId: `mos:${value}`,
      fiasLevel: 8,
      house: houseMatch?.[1]?.trim() ?? "1",
    });
  }

  return suggestions;
}

function rowToHit(row: MosDataRow): MoscowAddressHit | null {
  const cells = row.Cells ?? {};
  const address = cellString(cells, MOSCOW_ADDRESS_CELL_KEYS);
  if (!address) return null;
  return {
    address,
    buildingYear: parseYear(cellString(cells, YEAR_KEYS)),
  };
}

/**
 * Building year from Moscow open data (dommos passports / MKD registry).
 */
export async function lookupMoscowHousePassport(
  address: string,
  hints?: { street?: string | null; house?: string | null; block?: string | null },
): Promise<MoscowHousePassport | null> {
  const result = await lookupMoscowHousePassportWithDebug(address, hints);
  return result.passport;
}

export async function lookupMoscowHousePassportWithDebug(
  address: string,
  hints?: { street?: string | null; house?: string | null; block?: string | null },
): Promise<{ passport: MoscowHousePassport | null; debug: MoscowLookupDebug }> {
  const debug: MoscowLookupDebug = {
    configured: isMoscowOpenDataConfigured(),
    status: "not_configured",
  };

  if (!debug.configured) {
    return { passport: null, debug };
  }

  debug.apiProbe = await probeMoscowOpenDataApi();
  if (!debug.apiProbe.ok) {
    debug.status = "api_unreachable";
    debug.detail =
      debug.apiProbe.error ??
      (debug.apiProbe.status ? `HTTP ${debug.apiProbe.status}` : "network_error");
    return { passport: null, debug };
  }

  const datasetId = await resolvePassportDatasetId();
  debug.datasetId = datasetId;
  if (!datasetId) {
    debug.status = "no_dataset";
    debug.detail =
      "Не найден набор «База жилых домов». Задайте MOS_DOM_PASSPORT_DATASET_ID в Vercel.";
    return { passport: null, debug };
  }

  try {
    const row = await findPassportRow(datasetId, address, hints);
    if (!row?.Cells) {
      debug.status = "no_match";
      debug.detail = "Адрес не найден в реестре dommos.";
      return { passport: null, debug };
    }

    const cells = row.Cells;
    const resolvedAddress =
      cellString(cells, MOSCOW_ADDRESS_CELL_KEYS) || address.trim();
    const buildingYear = parseYear(cellString(cells, YEAR_KEYS));
    const operationYear = parseYear(cellString(cells, OPERATION_YEAR_KEYS));

    if (!resolvedAddress && !buildingYear) {
      debug.status = "no_match";
      debug.detail = "Строка найдена, но год постройки пустой.";
      return { passport: null, debug };
    }

    const passport: MoscowHousePassport = {
      address: resolvedAddress,
      buildingYear,
      operationYear,
      sourceLabel: "Открытые данные Москвы",
    };

    if (!buildingYear && !operationYear) {
      debug.status = "no_match";
      debug.detail = "Строка найдена, но год постройки пустой.";
      return { passport: null, debug };
    }

    debug.status = "ok";
    return { passport, debug };
  } catch (error) {
    console.error("Moscow house passport lookup failed", error);
    debug.status = "error";
    debug.detail = error instanceof Error ? error.message : "lookup_failed";
    return { passport: null, debug };
  }
}

/** Warm dataset cache (optional). */
export async function warmMoscowDatasetIds(): Promise<void> {
  await resolvePassportDatasetId();
  await resolveCapitalRepairDatasetId();
}
