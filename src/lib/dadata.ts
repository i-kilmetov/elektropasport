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
    street_with_type?: string | null;
    city?: string | null;
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
    });
  }
  return parsed;
}
