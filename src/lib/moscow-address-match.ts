export function normalizeAddressPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHouseTokens(address: string): string[] {
  const norm = normalizeAddressPart(address);
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
  const a = normalizeAddressPart(stored);
  const b = normalizeAddressPart(query);
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

/** Tokens for Moscow open-data search (longest first). */
export function pickAddressSearchTokens(query: string): string[] {
  const norm = normalizeAddressPart(query);
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of extractHouseTokens(query)) {
    if (token.length >= 2 && !ADDRESS_QUERY_STOP_WORDS.has(token) && !seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }

  for (const token of norm.split(" ").filter(Boolean)) {
    if (token.length >= 3 && !ADDRESS_QUERY_STOP_WORDS.has(token) && !seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }

  return tokens.sort((a, b) => b.length - a.length);
}
