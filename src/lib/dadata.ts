export const MOSCOW_KLADR_ID = "77";
export const MIN_ADDRESS_HOUSE_LEVEL = 8;

export type AddressSuggestion = {
  value: string;
  unrestrictedValue: string;
  fiasId?: string;
  fiasLevel: number;
  house?: string;
  street?: string;
};

type DaDataSuggestion = {
  value?: string;
  unrestricted_value?: string;
  data?: {
    fias_id?: string | null;
    fias_level?: string | number | null;
    house?: string | null;
    street_with_type?: string | null;
    city?: string | null;
  };
};

export function hasHouse(suggestion: Pick<AddressSuggestion, "fiasLevel" | "house">): boolean {
  return Boolean(suggestion.house) || suggestion.fiasLevel >= MIN_ADDRESS_HOUSE_LEVEL;
}

export function parseDaDataSuggestions(raw: unknown): AddressSuggestion[] {
  const list = (raw as { suggestions?: DaDataSuggestion[] } | null)?.suggestions;
  if (!Array.isArray(list)) return [];

  const parsed: AddressSuggestion[] = [];
  for (const item of list) {
    const value = item.value?.trim();
    if (!value) continue;
    const fiasLevel = Number(item.data?.fias_level ?? 0);
    parsed.push({
      value,
      unrestrictedValue: item.unrestricted_value?.trim() || value,
      fiasId: item.data?.fias_id ?? undefined,
      fiasLevel: Number.isFinite(fiasLevel) ? fiasLevel : 0,
      house: item.data?.house ?? undefined,
      street: item.data?.street_with_type ?? undefined,
    });
  }
  return parsed;
}
