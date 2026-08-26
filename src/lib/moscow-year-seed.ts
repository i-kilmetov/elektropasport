import {
  buildMoscowAddressKey,
  normalizeAddressPart,
  preprocessAddress,
} from "@/lib/moscow-address-match";

/**
 * Seed of Moscow houses with construction years verified via OpenStreetMap.
 * Keys use street names AFTER type stripping (ул/проезд/проспект removed),
 * matching `buildMoscowAddressKey` / `parseMoscowAddressKey`.
 */
const MOSCOW_YEAR_SEED: Record<string, number> = {
  "осташковский|4": 1983,
  "профсоюзная|15": 1960,
  "кривоарбатский|10": 1927,
};

function seedKey(street: string, house: string, building?: string | null): string {
  const base = `${normalizeAddressPart(street)}|${normalizeAddressPart(house)}`;
  if (building) return `${base}|${normalizeAddressPart(building)}`;
  return base;
}

export function lookupMoscowYearFromSeed(input: {
  address: string;
  street?: string | null;
  house?: string | null;
  block?: string | null;
}): { address: string; buildingYear: number } | null {
  const key = buildMoscowAddressKey({
    address: preprocessAddress(input.address),
    street: input.street,
    house: input.house,
    block: input.block,
  });
  if (!key) return null;

  const exact = MOSCOW_YEAR_SEED[seedKey(key.street, key.house, key.building)];
  if (exact != null) {
    return { address: input.address, buildingYear: exact };
  }

  const withoutBuilding = MOSCOW_YEAR_SEED[seedKey(key.street, key.house)];
  if (withoutBuilding != null) {
    return { address: input.address, buildingYear: withoutBuilding };
  }

  return null;
}

/** QA examples that resolve without mos.ru (year from OSM seed). */
export const MOSCOW_YEAR_DEMO_ADDRESSES = [
  {
    query: "Осташковский проезд, д. 4",
    buildingYear: 1983,
  },
  {
    query: "Профсоюзная улица, 15",
    buildingYear: 1960,
  },
  {
    query: "Кривоарбатский переулок, 10",
    buildingYear: 1927,
  },
] as const;
