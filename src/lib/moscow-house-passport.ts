import {
  addressesLikelyMatch,
  cellString,
  extractHouseTokens,
  MOSCOW_ADDRESS_CELL_KEYS,
} from "@/lib/moscow-address-match";
import {
  fetchDatasetColumns,
  fetchDatasetRows,
  isMoscowOpenDataConfigured,
  resolveCapitalRepairDatasetId,
  type MosDataRow,
} from "@/lib/moscow-open-data";

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
