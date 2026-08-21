import {
  electricalGuessForYear,
  type HouseInsight,
  type HouseManagementCompany,
} from "@/lib/house-insight";

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

export async function findHouseFiasByAddress(
  query: string,
): Promise<HouseScoreFindItem | null> {
  const q = query.trim();
  if (q.length < 10) return null;

  const payload = await housescoreGet<{ data?: HouseScoreFindItem[] }>(
    "/api/houses/find-by-address",
    { q },
  );
  const first = payload?.data?.[0];
  return first?.fias_id ? first : null;
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

  // Prefer HouseScore's own house GUID for management — DaData flat/house ids
  // can differ from the GUID their /management index uses.
  const found = await findHouseFiasByAddress(
    normalizeQueryAddress(city, address),
  );
  if (found?.fias_id) {
    fiasId = found.fias_id;
    foundAddress = found.address?.trim() || address;
    foundCity = found.city?.trim() || foundCity;
    fiasCandidates.push(found.fias_id);
  }
  if (clientFiasId) fiasCandidates.push(clientFiasId);
  if (fiasId) fiasCandidates.push(fiasId);

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
