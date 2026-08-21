import {
  electricalGuessForYear,
  type HouseInsight,
  type HouseManagementCompany,
} from "@/lib/house-insight";
import type { AddressSuggestion } from "@/lib/dadata";

const HOUSESCORE_BASE = "https://housescore.ru";

type HouseScoreHouse = {
  fias_guid?: string;
  city?: string | null;
  address?: string | null;
  building_year?: number | null;
  operation_year?: number | null;
};

type HouseScoreFindItem = {
  address?: string | null;
  fias_id?: string | null;
  city?: string | null;
  street?: string | null;
  house?: string | null;
};

type HouseScoreManagementCompany = {
  inn?: string | null;
  ogrn?: string | null;
  name?: string | null;
};

type HouseScoreManagement = {
  management_type?: string | null;
  management_company?:
    | HouseScoreManagementCompany
    | HouseScoreManagementCompany[]
    | null;
  management_companies?:
    | HouseScoreManagementCompany
    | HouseScoreManagementCompany[]
    | null;
  data?: HouseScoreManagement | null;
};

type HouseScoreCompany = {
  ogrn?: string | null;
  name?: string | null;
  phone?: string | null;
};

function asCompanyList(
  raw: HouseScoreManagementCompany | HouseScoreManagementCompany[] | null | undefined,
): HouseScoreManagementCompany[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((item) => item && typeof item === "object");
  }
  if (typeof raw === "object") return [raw];
  return [];
}

function parseManagementPayload(payload: HouseScoreManagement | null): {
  managementType: string | null;
  companies: HouseScoreManagementCompany[];
} {
  if (!payload || typeof payload !== "object") {
    return { managementType: null, companies: [] };
  }
  const root = payload.data && typeof payload.data === "object" ? payload.data : payload;
  const companies = [
    ...asCompanyList(root.management_company),
    ...asCompanyList(root.management_companies),
  ];
  // Deduplicate by ogrn/name
  const seen = new Set<string>();
  const unique = companies.filter((company) => {
    const key = `${company.ogrn ?? ""}|${company.name ?? ""}`.toLowerCase();
    if (!key || key === "|") return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(company.name?.trim() || company.ogrn?.trim());
  });
  return {
    managementType: root.management_type?.trim() || null,
    companies: unique,
  };
}

function getToken(): string | null {
  return process.env.HOUSESCORE_API_TOKEN?.trim() || null;
}

async function housescoreGet<T>(
  path: string,
  searchParams?: Record<string, string>,
  options?: { optional?: boolean },
): Promise<T | null> {
  const token = getToken();
  if (!token) return null;

  const url = new URL(path, HOUSESCORE_BASE);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("HouseScore request failed", path, res.status, body);
    if (options?.optional) return null;
    throw new Error("HouseScore unavailable");
  }

  return (await res.json()) as T;
}

function normalizeQueryAddress(city: string, address: string): string {
  const cityPart = city.trim();
  let addressPart = address.trim();
  // HouseScore indexes buildings, not flats — drop apartment/office suffixes.
  addressPart = addressPart
    .replace(
      /(?:,?\s*)(?:кв\.?|квартира|офис|оф\.?)\s*\d+[а-яa-z]?/gi,
      "",
    )
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cityPart) return addressPart;
  if (addressPart.toLowerCase().includes(cityPart.toLowerCase())) {
    return addressPart;
  }
  return `${cityPart}, ${addressPart}`;
}

export function isHouseScoreConfigured(): boolean {
  return Boolean(getToken());
}

export { normalizeQueryAddress };

export async function searchHousesByAddress(
  query: string,
): Promise<HouseScoreFindItem[]> {
  const q = query.trim();
  // HouseScore requires at least 10 characters in `q`.
  if (q.length < 10) return [];

  const payload = await housescoreGet<{ data?: HouseScoreFindItem[] }>(
    "/api/houses/find-by-address",
    { q },
  );
  const list = payload?.data;
  if (!Array.isArray(list)) return [];
  return list.filter((item) => Boolean(item.fias_id?.trim()));
}

export async function findHouseFiasByAddress(
  query: string,
): Promise<HouseScoreFindItem | null> {
  const list = await searchHousesByAddress(query);
  return list[0] ?? null;
}

/** Map HouseScore find-by-address hits into the shared suggestion shape. */
export function mapHouseScoreFindsToSuggestions(
  items: HouseScoreFindItem[],
  cityFilter?: string,
): AddressSuggestion[] {
  const cityNorm = cityFilter?.trim().toLowerCase() ?? "";
  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];

  for (const item of items) {
    const fiasId = item.fias_id?.trim();
    if (!fiasId || seen.has(fiasId)) continue;

    const itemCity = item.city?.trim() ?? "";
    if (
      cityNorm &&
      itemCity &&
      !itemCity.toLowerCase().includes(cityNorm) &&
      !cityNorm.includes(itemCity.toLowerCase())
    ) {
      continue;
    }

    const full = item.address?.trim() || "";
    const short = [item.street?.trim(), item.house ? `д. ${item.house.trim()}` : ""]
      .filter(Boolean)
      .join(", ");
    const value = full || short;
    if (!value) continue;

    seen.add(fiasId);
    suggestions.push({
      value,
      unrestrictedValue: full || value,
      fiasId,
      houseFiasId: fiasId,
      fiasLevel: 8,
      house: item.house?.trim() || undefined,
      street: item.street?.trim() || undefined,
    });
  }

  return suggestions;
}

export async function fetchHouseByFias(
  fiasId: string,
): Promise<HouseScoreHouse | null> {
  return housescoreGet<HouseScoreHouse>(
    `/api/houses/${encodeURIComponent(fiasId)}`,
  );
}

export async function fetchHouseManagement(
  fiasId: string,
): Promise<HouseScoreManagement | null> {
  return housescoreGet<HouseScoreManagement>(
    `/api/houses/${encodeURIComponent(fiasId)}/management`,
    undefined,
    { optional: true },
  );
}

export async function fetchCompanyByOgrn(
  ogrn: string,
): Promise<HouseScoreCompany | null> {
  return housescoreGet<HouseScoreCompany>(
    `/api/companies/${encodeURIComponent(ogrn)}`,
  );
}

async function resolveManagementCompany(
  fiasIds: string[],
): Promise<{
  management: HouseManagementCompany | null;
  managementType: string | null;
}> {
  const tried = new Set<string>();
  for (const fiasId of fiasIds) {
    const id = fiasId.trim();
    if (!id || tried.has(id)) continue;
    tried.add(id);

    const managementPayload = await fetchHouseManagement(id);
    const parsed = parseManagementPayload(managementPayload);
    const first =
      parsed.companies.find((c) => c.name?.trim()) ?? parsed.companies[0];

    if (!first) {
      if (managementPayload) {
        console.warn(
          "HouseScore management empty",
          id,
          JSON.stringify(managementPayload).slice(0, 500),
        );
      }
      continue;
    }

    let phone: string | null = null;
    const ogrn = first.ogrn?.trim() || null;
    if (ogrn) {
      try {
        const company = await fetchCompanyByOgrn(ogrn);
        phone = company?.phone?.trim() || null;
      } catch {
        phone = null;
      }
    }

    const name = first.name?.trim() || (ogrn ? `УК ОГРН ${ogrn}` : null);
    if (!name) continue;

    return {
      managementType: parsed.managementType,
      management: { name, phone, ogrn },
    };
  }

  return { management: null, managementType: null };
}

export async function lookupHouseInsight(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): Promise<HouseInsight> {
  const city = input.city.trim();
  const address = input.address.trim();
  const clientFiasId = input.fiasId?.trim() || null;
  let fiasId = clientFiasId;
  let foundAddress = address;
  let foundCity: string | null = city || null;
  const fiasCandidates: string[] = [];
  if (clientFiasId) fiasCandidates.push(clientFiasId);

  // Also resolve via HouseScore search — fills gaps when the client had no fias,
  // and adds an alternate GUID if DaData/HS ids diverge.
  const found = await findHouseFiasByAddress(
    normalizeQueryAddress(city, address),
  );
  if (found?.fias_id) {
    foundAddress = found.address?.trim() || address;
    foundCity = found.city?.trim() || foundCity;
    fiasCandidates.push(found.fias_id);
    if (!fiasId) fiasId = found.fias_id;
  }

  if (!fiasId) {
    return {
      address,
      city: foundCity,
      fiasId: null,
      buildingYear: null,
      operationYear: null,
      electrical: electricalGuessForYear(null),
      management: null,
      managementType: null,
    };
  }

  const house = await fetchHouseByFias(fiasId);
  if (house?.fias_guid) fiasCandidates.unshift(house.fias_guid);

  const buildingYear =
    typeof house?.building_year === "number" ? house.building_year : null;
  const operationYear =
    typeof house?.operation_year === "number" ? house.operation_year : null;

  let management: HouseManagementCompany | null = null;
  let managementType: string | null = null;
  try {
    const resolved = await resolveManagementCompany(fiasCandidates);
    management = resolved.management;
    managementType = resolved.managementType;
  } catch (error) {
    console.error("HouseScore management lookup failed", error);
  }

  return {
    address: house?.address?.trim() || foundAddress,
    city: house?.city?.trim() || foundCity,
    fiasId,
    buildingYear,
    operationYear,
    electrical: electricalGuessForYear(buildingYear ?? operationYear),
    management,
    managementType,
  };
}
