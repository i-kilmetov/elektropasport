import {
  MOSCOW_KLADR_ID,
  parseDaDataSuggestions,
  type AddressSuggestion,
} from "@/lib/dadata";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";

const DADATA_FIND_BY_ID_URL =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/address";
const DADATA_SUGGEST_URL =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";

export type DaDataHouseLookup = {
  address: string;
  city: string | null;
  fiasId: string | null;
  buildingYear: number | null;
  suggestion: AddressSuggestion | null;
};

function dadataToken(): string | null {
  return process.env.DADATA_API_KEY?.trim() || null;
}

function parseYearCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const year = Math.trunc(value);
    return year >= 1800 && year <= 2100 ? year : null;
  }
  if (typeof value === "string") {
    const match = value.match(/(18|19|20)\d{2}/);
    if (!match) return null;
    const year = Number(match[0]);
    return year >= 1800 && year <= 2100 ? year : null;
  }
  return null;
}

const YEAR_KEY =
  /(year|built|build|constr|постро|эксплуат|ввод|commission|estate)/i;

/** Walk DaData payloads for any construction / commissioning year fields. */
export function extractBuildingYearFromUnknown(raw: unknown): number | null {
  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (YEAR_KEY.test(key)) {
        const year = parseYearCandidate(value);
        if (year != null) return year;
      }
      if (value && typeof value === "object") stack.push(value);
    }
  }

  return null;
}

async function dadataPost(
  url: string,
  body: Record<string, unknown>,
): Promise<unknown | null> {
  const token = dadataToken();
  if (!token) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.error("DaData house lookup failed", url, res.status, await res.text());
    return null;
  }

  return res.json();
}

async function findById(query: string): Promise<unknown | null> {
  return dadataPost(DADATA_FIND_BY_ID_URL, { query, count: 1 });
}

async function suggestHouse(
  query: string,
  city: string,
): Promise<unknown | null> {
  const normalizedCity = normalizeCityName(city);
  const locations = isMoscow(normalizedCity)
    ? [{ kladr_id: MOSCOW_KLADR_ID }]
    : [{ city: normalizedCity }];

  return dadataPost(DADATA_SUGGEST_URL, {
    query,
    count: 5,
    locations,
    restrict_value: true,
    from_bound: { value: "house" },
    to_bound: { value: "house" },
  });
}

function firstSuggestion(raw: unknown): AddressSuggestion | null {
  return parseDaDataSuggestions(raw)[0] ?? null;
}

/**
 * Resolve house details via DaData (findById by FIAS, then suggest by address).
 * Building year is taken from DaData when the payload includes it.
 */
export async function lookupHouseFromDaData(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): Promise<DaDataHouseLookup> {
  const city = normalizeCityName(input.city);
  const address = input.address.trim();
  const fiasId = input.fiasId?.trim() || null;

  let raw: unknown | null = null;
  if (fiasId && !fiasId.startsWith("mos:")) {
    raw = await findById(fiasId);
  }
  if (!raw) {
    raw = await suggestHouse(address, city);
  }
  if (!raw && fiasId) {
    raw = await findById(fiasId);
  }

  const suggestion = firstSuggestion(raw);
  const buildingYear = extractBuildingYearFromUnknown(raw);

  return {
    address: suggestion?.value?.trim() || address,
    city:
      suggestion?.city?.trim() ||
      city ||
      null,
    fiasId:
      suggestion?.houseFiasId ||
      suggestion?.fiasId ||
      (fiasId && !fiasId.startsWith("mos:") ? fiasId : null),
    buildingYear,
    suggestion,
  };
}
