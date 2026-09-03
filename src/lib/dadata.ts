export const MOSCOW_KLADR_ID = "77";
export const MIN_ADDRESS_HOUSE_LEVEL = 8;
export const MIN_ADDRESS_FLAT_LEVEL = 9;

export type AddressSuggestion = {
  value: string;
  unrestrictedValue: string;
  fiasId?: string;
  houseFiasId?: string;
  streetFiasId?: string;
  fiasLevel: number;
  house?: string;
  street?: string;
  flat?: string;
  block?: string;
  building?: string;
  city?: string;
  /** Present when suggestion came from Moscow open-data house registry. */
  buildingYear?: number;
};

export type CitySuggestion = {
  /** Short city/settlement name used for address search */
  name: string;
  /** Display label, optionally with region */
  label: string;
  region?: string;
  kladrId?: string;
  fiasId?: string;
};

export type GeolocatedAddress = AddressSuggestion & {
  city: string;
};

type DaDataSuggestion = {
  value?: string;
  unrestricted_value?: string;
  data?: {
    fias_id?: string | null;
    house_fias_id?: string | null;
    street_fias_id?: string | null;
    fias_level?: string | number | null;
    house?: string | null;
    block?: string | null;
    building?: string | null;
    street_with_type?: string | null;
    city?: string | null;
    settlement?: string | null;
    city_with_type?: string | null;
    settlement_with_type?: string | null;
    region?: string | null;
    region_with_type?: string | null;
    city_kladr_id?: string | null;
    settlement_kladr_id?: string | null;
    kladr_id?: string | null;
    flat?: string | null;
  };
};

export function hasHouse(
  suggestion: Pick<AddressSuggestion, "fiasLevel" | "house" | "flat">,
): boolean {
  return (
    Boolean(suggestion.house) ||
    Boolean(suggestion.flat) ||
    suggestion.fiasLevel >= MIN_ADDRESS_HOUSE_LEVEL
  );
}

export function hasFlat(
  suggestion: Pick<AddressSuggestion, "fiasLevel" | "flat">,
): boolean {
  return Boolean(suggestion.flat) || suggestion.fiasLevel >= MIN_ADDRESS_FLAT_LEVEL;
}

function stripPlacePrefix(value: string): string {
  return value
    .replace(
      /^(г|гор\.?|город|пгт|пос\.?|п\.|село|деревня|д\.|рп|ст-ца|станица)\s+/i,
      "",
    )
    .trim();
}

export function parseDaDataSuggestions(raw: unknown): AddressSuggestion[] {
  const list = (raw as { suggestions?: DaDataSuggestion[] } | null)?.suggestions;
  if (!Array.isArray(list)) return [];

  const parsed: AddressSuggestion[] = [];
  for (const item of list) {
    const value = item.value?.trim();
    if (!value) continue;
    const fiasLevel = Number(item.data?.fias_level ?? 0);
    const houseFiasId = item.data?.house_fias_id ?? undefined;
    const fiasId = item.data?.fias_id ?? undefined;
    const city =
      item.data?.city?.trim() ||
      item.data?.settlement?.trim() ||
      item.data?.city_with_type?.trim() ||
      item.data?.settlement_with_type?.trim() ||
      undefined;
    parsed.push({
      value,
      unrestrictedValue: item.unrestricted_value?.trim() || value,
      fiasId,
      houseFiasId: houseFiasId || (fiasLevel >= 8 ? fiasId : undefined),
      streetFiasId: item.data?.street_fias_id ?? undefined,
      fiasLevel: Number.isFinite(fiasLevel) ? fiasLevel : 0,
      house: item.data?.house ?? undefined,
      street: item.data?.street_with_type ?? undefined,
      flat: item.data?.flat ?? undefined,
      block: item.data?.block ?? undefined,
      building: item.data?.building ?? undefined,
      city,
    });
  }
  return parsed;
}

/** City / settlement suggestions for Russia-wide city picker. */
export function parseDaDataCitySuggestions(raw: unknown): CitySuggestion[] {
  const list = (raw as { suggestions?: DaDataSuggestion[] } | null)?.suggestions;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const parsed: CitySuggestion[] = [];

  for (const item of list) {
    const nameRaw =
      item.data?.city?.trim() ||
      item.data?.settlement?.trim() ||
      stripPlacePrefix(item.value?.trim() ?? "");
    if (!nameRaw) continue;

    const name = stripPlacePrefix(nameRaw) || nameRaw;
    const region =
      item.data?.region_with_type?.trim() ||
      item.data?.region?.trim() ||
      undefined;
    const kladrId =
      item.data?.city_kladr_id?.trim() ||
      item.data?.settlement_kladr_id?.trim() ||
      item.data?.kladr_id?.trim() ||
      undefined;
    const fiasId = item.data?.fias_id?.trim() || undefined;
    const label =
      region && !name.toLowerCase().includes(region.toLowerCase())
        ? `${name} (${region})`
        : name;
    const dedupeKey = `${name.toLowerCase()}|${(region ?? "").toLowerCase()}|${kladrId ?? fiasId ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    parsed.push({ name, label, region, kladrId, fiasId });
  }

  return parsed;
}

/** Best reverse-geocode hit with a usable city name. */
export function parseDaDataGeolocate(raw: unknown): GeolocatedAddress | null {
  const [first] = parseDaDataSuggestions(raw);
  if (!first) return null;
  const city = first.city?.trim();
  if (!city) return null;
  return { ...first, city };
}
