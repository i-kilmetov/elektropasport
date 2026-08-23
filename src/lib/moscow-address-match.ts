export function normalizeAddressPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expand common abbreviations before tokenization (DaData vs dommos). */
export function preprocessAddress(raw: string): string {
  return raw
    .replace(/\bпр-кт\b/gi, "проспект")
    .replace(/\bб-р\b/gi, "бульвар")
    .replace(/\bнаб\.\b/gi, "набережная")
    .replace(/\b(\d+)-й\b/gi, "$1-й")
    .replace(/\b(\d+)-го\b/gi, "$1-го")
    .replace(/\b(\d+)-я\b/gi, "$1-я")
    .trim();
}

export type MoscowAddressKey = {
  street: string;
  house: string;
  building: string | null;
};

const CITY_PREFIX =
  /^(?:\d{6}\s*,?\s*)?(?:г\.?\s*)?(?:москва|moscow)(?:\s+г)?\s*,?\s*/i;

const STREET_TYPE_PREFIX =
  /^(?:ул\.?|улица|пр\.?|просп\.?|проспект|пер\.?|переулок|бул\.?|бульвар|ш\.?|шоссе|наб\.?|набережная|ал\.?|аллея|пл\.?|площадь|проезд|туп\.?|тупик|линия|кв-л|квартал|мкр\.?|микрорайон)\s+/i;

function stripStreetType(value: string): string {
  let rest = value.trim();
  while (STREET_TYPE_PREFIX.test(rest)) {
    rest = rest.replace(STREET_TYPE_PREFIX, "").trim();
  }
  return rest;
}

function parseHouseAndBuilding(source: string): {
  house: string | null;
  building: string | null;
  streetPart: string;
} {
  let streetPart = source.trim();
  let house: string | null = null;
  let building: string | null = null;

  const houseMatch =
    /(?:,\s*)?(?:д\.?|дом)\s*([\d]+[a-zа-я]?(?:\/[\da-zа-я]+)?)/i.exec(source);
  if (houseMatch?.[1]) {
    house = normalizeAddressPart(houseMatch[1]);
    streetPart = source.slice(0, houseMatch.index).replace(/,\s*$/, "").trim();
  }

  const buildingMatch =
    /(?:,\s*)?(?:к\.?|корп\.?|корпус|стр\.?|строение)\s*([\d]+[a-zа-я]?)/i.exec(
      source,
    );
  if (buildingMatch?.[1]) {
    building = normalizeAddressPart(buildingMatch[1]);
    if (!house && buildingMatch.index != null) {
      streetPart = source.slice(0, buildingMatch.index).replace(/,\s*$/, "").trim();
    }
  }

  if (!house) {
    const trailing = /,\s*([\d]+[a-zа-я]?(?:\/[\da-zа-я]+)?)\s*$/.exec(source);
    if (trailing?.[1]) {
      house = normalizeAddressPart(trailing[1]);
      streetPart = source.slice(0, trailing.index).replace(/,\s*$/, "").trim();
    }
  }

  return { house, building, streetPart };
}

/** Canonical street + house key for matching DaData against dommos rows. */
export function parseMoscowAddressKey(raw: string): MoscowAddressKey | null {
  const prepared = preprocessAddress(raw.trim());
  let withoutCity = prepared.replace(CITY_PREFIX, "").trim();
  withoutCity = withoutCity
    .replace(/^(?:россия|рф)\s*,?\s*/i, "")
    .replace(/(?:,\s*)?(?:кв\.?|квартира|офис|оф\.?)\s*\d+[a-zа-я]?.*$/i, "")
    .trim();

  const { house, building, streetPart } = parseHouseAndBuilding(withoutCity);
  if (!house) return null;

  const street = normalizeAddressPart(stripStreetType(streetPart));
  if (!street || street.length < 2) return null;

  return { street, house, building };
}

export function buildMoscowAddressKey(input: {
  address: string;
  street?: string | null;
  house?: string | null;
  block?: string | null;
}): MoscowAddressKey | null {
  const fromAddress = parseMoscowAddressKey(input.address);
  const streetRaw = input.street?.trim() ?? "";
  const houseRaw = input.house?.trim() ?? "";
  const blockRaw = input.block?.trim() ?? "";

  if (streetRaw && houseRaw) {
    const street = normalizeAddressPart(stripStreetType(preprocessAddress(streetRaw)));
    const house = normalizeAddressPart(houseRaw);
    const building = blockRaw ? normalizeAddressPart(blockRaw) : fromAddress?.building ?? null;
    if (street && house) {
      return { street, house, building };
    }
  }

  return fromAddress;
}

function houseNumbersMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aBase = a.split("/")[0] ?? a;
  const bBase = b.split("/")[0] ?? b;
  return aBase === bBase;
}

export function moscowAddressKeysMatch(
  a: MoscowAddressKey,
  b: MoscowAddressKey,
): boolean {
  if (!houseNumbersMatch(a.house, b.house)) return false;
  if (a.building && b.building && a.building !== b.building) return false;

  if (a.street === b.street) return true;
  if (a.street.includes(b.street) || b.street.includes(a.street)) return true;

  const aTokens = a.street.split(" ").filter((t) => t.length > 1);
  const bTokens = b.street.split(" ").filter((t) => t.length > 1);
  if (aTokens.length === 0 || bTokens.length === 0) return false;

  const overlap = aTokens.filter((token) => b.street.includes(token)).length;
  const minLen = Math.min(aTokens.length, bTokens.length);
  return overlap >= Math.max(1, minLen - 1);
}

/** Higher = better match (0 = no match). */
export function scoreMoscowAddressMatch(
  storedAddress: string,
  queryKey: MoscowAddressKey,
): number {
  const storedKey = parseMoscowAddressKey(storedAddress);
  if (storedKey && moscowAddressKeysMatch(storedKey, queryKey)) {
    let score = 100;
    if (storedKey.street === queryKey.street) score += 20;
    if (storedKey.house === queryKey.house) score += 10;
    if (queryKey.building && storedKey.building === queryKey.building) score += 5;
    return score;
  }

  if (addressesLikelyMatchLoose(storedAddress, queryKey)) return 40;
  return 0;
}

function addressesLikelyMatchLoose(
  stored: string,
  queryKey: MoscowAddressKey,
): boolean {
  const norm = normalizeAddressPart(preprocessAddress(stored));
  const streetTokens = queryKey.street.split(" ").filter((t) => t.length > 1);
  if (streetTokens.length === 0) return false;
  const streetOk = streetTokens.every((token) => norm.includes(token));
  const houseOk =
    norm.includes(queryKey.house) ||
    norm.includes(queryKey.house.replace("/", " "));
  return streetOk && houseOk;
}

export function extractHouseTokens(address: string): string[] {
  const key = parseMoscowAddressKey(address);
  if (key) {
    return [
      ...key.street.split(" ").filter((t) => t.length > 1),
      key.house,
      ...(key.building ? [key.building] : []),
    ];
  }

  const norm = normalizeAddressPart(preprocessAddress(address));
  const tokens = norm.split(" ").filter(Boolean);
  const houseMatch =
    /(?:д\.?|дом|к\.?|корп\.?|стр\.?)\s*([\d/a-zа-я-]+)/i.exec(address) ??
    /,\s*([\d/a-zа-я-]+)\s*$/.exec(address);
  const house = houseMatch?.[1]
    ? normalizeAddressPart(houseMatch[1])
    : tokens.at(-1) ?? "";
  const streetTokens = tokens.filter(
    (token) =>
      token.length > 2 &&
      token !== house &&
      !["москва", "город", "россия", "ул", "улица", "пр", "проспект"].includes(
        token,
      ),
  );
  return [...streetTokens.slice(-3), house].filter(Boolean);
}

export function addressesLikelyMatch(stored: string, query: string): boolean {
  const queryKey = parseMoscowAddressKey(query);
  if (queryKey) {
    return scoreMoscowAddressMatch(stored, queryKey) >= 40;
  }

  const a = normalizeAddressPart(preprocessAddress(stored));
  const b = normalizeAddressPart(preprocessAddress(query));
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const tokens = extractHouseTokens(query);
  if (tokens.length === 0) return false;
  return tokens.every((token) => a.includes(token));
}

export function cellString(
  cells: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const direct = cells[key];
    if (direct != null && String(direct).trim()) return String(direct).trim();
  }
  const lowerMap = new Map(
    Object.entries(cells).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const value = lowerMap.get(key.toLowerCase());
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

export const MOSCOW_ADDRESS_CELL_KEYS = [
  "address",
  "Address",
  "AddressMKD",
  "ADDRESS",
  "SIMPLE_ADDRESS",
  "FullAddress",
  "AddressStr",
  "Adress",
];

const ADDRESS_QUERY_STOP_WORDS = new Set([
  "москва",
  "город",
  "россия",
  "ул",
  "улица",
  "пр",
  "проспект",
  "пер",
  "переулок",
  "бул",
  "бульвар",
  "ш",
  "шоссе",
  "наб",
  "набережная",
  "д",
  "дом",
  "к",
  "корп",
  "стр",
]);

/** Tokens for Moscow open-data API search (longest first). */
export function pickAddressSearchTokens(
  query: string,
  key?: MoscowAddressKey | null,
): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];

  const add = (token: string | null | undefined) => {
    const t = token?.trim();
    if (!t || t.length < 2 || ADDRESS_QUERY_STOP_WORDS.has(t) || seen.has(t)) {
      return;
    }
    seen.add(t);
    tokens.push(t);
  };

  if (key) {
    add(key.house);
    add(key.building);
    for (const part of key.street.split(" ").filter((t) => t.length > 2)) {
      add(part);
    }
    if (key.street.length >= 4) add(key.street);
  }

  for (const token of extractHouseTokens(query)) add(token);

  const norm = normalizeAddressPart(preprocessAddress(query));
  for (const token of norm.split(" ").filter(Boolean)) {
    if (token.length >= 3) add(token);
  }

  return tokens.sort((a, b) => b.length - a.length);
}

/** Filter tokens as sent to apidata.mos.ru (street fragments + house number). */
export function pickMoscowApiSearchTokens(key: MoscowAddressKey): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2 || seen.has(trimmed)) return;
    seen.add(trimmed);
    tokens.push(trimmed);
  };

  add(key.house);
  if (key.house.includes("/")) {
    add(key.house.split("/")[0] ?? "");
  }

  const streetParts = key.street.split(" ").filter((t) => t.length > 2);
  for (const part of streetParts) add(part);
  if (key.street.length >= 5) add(key.street);

  const streetWords = key.street.split(" ").filter(Boolean);
  if (streetWords.length >= 2) {
    add(streetWords.slice(-2).join(" "));
  }

  return tokens;
}
