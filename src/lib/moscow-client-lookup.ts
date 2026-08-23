import { authHeaders } from "@/lib/client-auth";
import {
  buildMoscowAddressKey,
  pickMoscowApiSearchTokens,
  preprocessAddress,
  scoreMoscowAddressMatch,
} from "@/lib/moscow-address-match";
import { buildMoscowCellsFilter } from "@/lib/moscow-open-data";

const MOS_DATA_BASE = "https://apidata.mos.ru/v1";
const DEFAULT_PASSPORT_DATASET_ID = 60562;
const ADDRESS_COLUMNS = [
  "address",
  "full_address",
  "location",
  "street",
  "house_address",
];
const YEAR_KEYS = [
  "year_built",
  "year_built_house",
  "build_year",
  "construction_year",
  "year",
];

type MosRow = {
  global_id?: number;
  Number?: number;
  Cells?: Record<string, unknown>;
};

function cellString(cells: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = cells[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function parseYear(raw: string): number | null {
  const match = /(19|20)\d{2}/.exec(raw);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return year >= 1800 && year <= new Date().getFullYear() + 2 ? year : null;
}

async function fetchMoscowClientKey(): Promise<string | null> {
  const res = await fetch("/api/moscow-open-data/client-key", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { key?: string };
  return data.key?.trim() || null;
}

async function fetchMoscowRows(
  apiKey: string,
  datasetId: number,
  filter?: string,
): Promise<MosRow[]> {
  const url = new URL(`${MOS_DATA_BASE}/datasets/${datasetId}/rows`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("$top", "120");
  if (filter) url.searchParams.set("$filter", filter);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const payload = await res.json();
  return Array.isArray(payload) ? (payload as MosRow[]) : [];
}

function pickBestRow(rows: MosRow[], queryKey: ReturnType<typeof buildMoscowAddressKey>) {
  if (!queryKey) return null;
  let best: { row: MosRow; score: number } | null = null;
  for (const row of rows) {
    const stored = cellString(row.Cells ?? {}, ADDRESS_COLUMNS);
    if (!stored) continue;
    const score = scoreMoscowAddressMatch(stored, queryKey);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { row, score };
  }
  return best?.row ?? null;
}

/** Lookup building year from the user's browser (works when Vercel IP is blocked). */
export async function clientLookupMoscowPassport(
  address: string,
  hints?: {
    street?: string | null;
    house?: string | null;
    block?: string | null;
  },
): Promise<{ address: string; buildingYear: number | null } | null> {
  const apiKey = await fetchMoscowClientKey();
  if (!apiKey) return null;

  const queryKey = buildMoscowAddressKey({
    address: preprocessAddress(address),
    street: hints?.street,
    house: hints?.house,
    block: hints?.block,
  });
  if (!queryKey) return null;

  const datasetId = DEFAULT_PASSPORT_DATASET_ID;
  const candidates: MosRow[] = [];
  const seen = new Set<number>();

  const collect = (rows: MosRow[]) => {
    for (const row of rows) {
      const id = row.global_id ?? row.Number;
      if (id != null && seen.has(id)) continue;
      if (id != null) seen.add(id);
      candidates.push(row);
    }
  };

  const tokens = pickMoscowApiSearchTokens(queryKey).slice(0, 6);
  for (const token of tokens) {
    for (const column of ADDRESS_COLUMNS) {
      const rows = await fetchMoscowRows(
        apiKey,
        datasetId,
        buildMoscowCellsFilter(column, token),
      );
      collect(rows);
      const best = pickBestRow(candidates, queryKey);
      if (best?.Cells) {
        const resolved =
          cellString(best.Cells, ADDRESS_COLUMNS) || preprocessAddress(address);
        const buildingYear = parseYear(cellString(best.Cells, YEAR_KEYS));
        if (buildingYear) {
          return { address: resolved, buildingYear };
        }
      }
    }
  }

  const best = pickBestRow(candidates, queryKey);
  if (!best?.Cells) return null;
  const resolved =
    cellString(best.Cells, ADDRESS_COLUMNS) || preprocessAddress(address);
  const buildingYear = parseYear(cellString(best.Cells, YEAR_KEYS));
  if (!buildingYear) return null;
  return { address: resolved, buildingYear };
}
