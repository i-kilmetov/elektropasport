import {
  addressesLikelyMatch,
  cellString,
  extractHouseTokens,
  normalizeAddressPart,
  MOSCOW_ADDRESS_CELL_KEYS,
} from "@/lib/moscow-address-match";
import type { AddressSuggestion } from "@/lib/dadata";
import {
  fetchDatasetColumns,
  fetchDatasetRows,
  isMoscowOpenDataConfigured,
  resolveCapitalRepairDatasetId,
  type MosDataRow,
} from "@/lib/moscow-open-data";

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

async function resolvePassportDatasetId(): Promise<number | null> {
  const fromEnv = Number.parseInt(
    process.env.MOS_DOM_PASSPORT_DATASET_ID ?? "",
    10,
  );
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  if (cachedPassportDatasetId !== undefined) return cachedPassportDatasetId;

  // Reuse capital repair resolver's dataset list fetch indirectly:
  // scan via same /datasets list in open-data module.
  const { mosFetchDatasetList } = await import("@/lib/moscow-open-data");
  const list = await mosFetchDatasetList();
  if (!list) {
    cachedPassportDatasetId = null;
    return null;
  }

  const score = (caption: string): number => {
    const lower = caption.toLowerCase();
    let points = 0;
    if (/паспорт/.test(lower) && /жил/.test(lower)) points += 5;
    if (/мкд/.test(lower) || /многоквартир/.test(lower)) points += 2;
    if (/база.*дом/.test(lower)) points += 3;
    if (/dommos/.test(lower)) points += 2;
    return points;
  };

  let best: { id: number; caption: string } | null = null;
  for (const item of list) {
    const points = score(item.caption);
    if (points < 4) continue;
    if (!best || points > score(best.caption)) best = item;
  }

  cachedPassportDatasetId = best?.id ?? null;
  return cachedPassportDatasetId;
}

async function findPassportRow(
  datasetId: number,
  address: string,
): Promise<MosDataRow | null> {
  const columns = await fetchDatasetColumns(datasetId);
  const addressColumn = columns.find((col) =>
    MOSCOW_ADDRESS_CELL_KEYS.some(
      (key) =>
        col.name.toLowerCase() === key.toLowerCase() ||
        col.caption.toLowerCase().includes("адрес"),
    ),
  )?.name;

  const houseToken = extractHouseTokens(address).at(-1);
  if (addressColumn && houseToken) {
    const filtered = await fetchDatasetRows(datasetId, {
      top: 50,
      filter: `contains(${addressColumn}, '${houseToken.replace(/'/g, "''")}')`,
    });
    const match = filtered.find((row) =>
      addressesLikelyMatch(
        cellString(row.Cells ?? {}, MOSCOW_ADDRESS_CELL_KEYS),
        address,
      ),
    );
    if (match) return match;
  }

  const pageSize = 1000;
  for (let page = 0; page < 4; page += 1) {
    const rows = await fetchDatasetRows(datasetId, {
      skip: page * pageSize,
      top: pageSize,
    });
    if (rows.length === 0) break;
    const match = rows.find((row) =>
      addressesLikelyMatch(
        cellString(row.Cells ?? {}, MOSCOW_ADDRESS_CELL_KEYS),
        address,
      ),
    );
    if (match) return match;
    if (rows.length < pageSize) break;
  }
  return null;
}

function rowMatchesQuery(storedAddress: string, query: string): boolean {
  if (addressesLikelyMatch(storedAddress, query)) return true;
  const tokens = extractHouseTokens(query);
  if (tokens.length === 0) return false;
  const norm = normalizeAddressPart(storedAddress);
  return tokens.every((token) => norm.includes(token));
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

async function searchPassportRows(
  datasetId: number,
  query: string,
  limit: number,
): Promise<MosDataRow[]> {
  const columns = await fetchDatasetColumns(datasetId);
  const addressColumn = columns.find((col) =>
    MOSCOW_ADDRESS_CELL_KEYS.some(
      (key) =>
        col.name.toLowerCase() === key.toLowerCase() ||
        col.caption.toLowerCase().includes("адрес"),
    ),
  )?.name;

  const tokens = extractHouseTokens(query);
  const houseToken = tokens.at(-1);
  const results: MosDataRow[] = [];
  const seen = new Set<string>();

  const collect = (rows: MosDataRow[]) => {
    for (const row of rows) {
      if (results.length >= limit) break;
      const addr = cellString(row.Cells ?? {}, MOSCOW_ADDRESS_CELL_KEYS);
      if (!addr || seen.has(addr)) continue;
      if (!rowMatchesQuery(addr, query)) continue;
      seen.add(addr);
      results.push(row);
    }
  };

  if (addressColumn && houseToken) {
    const filtered = await fetchDatasetRows(datasetId, {
      top: Math.min(80, limit * 5),
      filter: `contains(${addressColumn}, '${houseToken.replace(/'/g, "''")}')`,
    });
    collect(filtered);
  }

  if (results.length < limit && addressColumn && tokens.length >= 2) {
    const streetToken = tokens[tokens.length - 2];
    if (streetToken && streetToken.length >= 4) {
      const filtered = await fetchDatasetRows(datasetId, {
        top: Math.min(80, limit * 5),
        filter: `contains(${addressColumn}, '${streetToken.replace(/'/g, "''")}')`,
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
      house: houseMatch?.[1]?.trim(),
    });
  }

  return suggestions;
}

/**
 * Building year from Moscow open data (dommos passports / MKD registry).
 */
export async function lookupMoscowHousePassport(
  address: string,
): Promise<MoscowHousePassport | null> {
  if (!isMoscowOpenDataConfigured()) return null;

  const datasetId = await resolvePassportDatasetId();
  if (!datasetId) return null;

  try {
    const row = await findPassportRow(datasetId, address);
    if (!row?.Cells) return null;

    const cells = row.Cells;
    const resolvedAddress =
      cellString(cells, MOSCOW_ADDRESS_CELL_KEYS) || address.trim();
    const buildingYear = parseYear(cellString(cells, YEAR_KEYS));
    const operationYear = parseYear(cellString(cells, OPERATION_YEAR_KEYS));

    if (!resolvedAddress && !buildingYear) return null;

    return {
      address: resolvedAddress,
      buildingYear,
      operationYear,
      sourceLabel: "Открытые данные Москвы",
    };
  } catch (error) {
    console.error("Moscow house passport lookup failed", error);
    return null;
  }
}

/** Warm dataset cache (optional). */
export async function warmMoscowDatasetIds(): Promise<void> {
  await resolvePassportDatasetId();
  await resolveCapitalRepairDatasetId();
}
