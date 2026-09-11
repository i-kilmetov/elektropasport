import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cityMatchKey, isMoscow } from "@/lib/lead-services";

export type ReformGkhHouse = {
  houseguid: string;
  address: string;
  buildingYear: number | null;
  floors: number | null;
  flats: number | null;
  electricalLastYear: number | null;
  electricalNextYear: number | null;
  region: string;
  regionLabel: string;
  sourceLabel: string;
};

type IndexEntry = {
  g: string;
  a: string;
  y: number | null;
  fl: number | null;
  fa: number | null;
  el: number | null;
  en: number | null;
};

type IndexFile = {
  region: string;
  label: string;
  updated?: string;
  houses: IndexEntry[];
};

type RegionIndex = {
  region: string;
  label: string;
  byGuid: Map<string, IndexEntry>;
  byAddress: Map<string, IndexEntry>;
};

const REGION_FILES = [
  { key: "moscow", file: "moscow.min.json.gz" },
  { key: "bashkortostan", file: "bashkortostan.min.json.gz" },
] as const;

const BASH_CITIES = new Set(
  ["уфа", "стерлитамак", "салават", "нефтекамск", "октябрьский"].map((c) =>
    cityMatchKey(c),
  ),
);

let cached: RegionIndex[] | null = null;

function normalizeAddressKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(
      /\b(г|город|республика|респ|москва|московский|башкортостан|уфа|стерлитамак|салават|нефтекамск|октябрьский|ул|улица|пр|просп|проспект|пер|переулок|б|бул|бульвар|ш|шоссе|наб|набережная|пл|площадь|д|дом|к|корп|корпус|стр|строение|вл|владение|мкр|микрорайон|р|рн|район|с|село|п|поселок|посёлок)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function loadRegion(file: string): RegionIndex | null {
  try {
    const full = path.join(
      process.cwd(),
      "data",
      "reform-gkh",
      "index",
      file,
    );
    const raw = gunzipSync(readFileSync(full)).toString("utf8");
    const parsed = JSON.parse(raw) as IndexFile;
    const byGuid = new Map<string, IndexEntry>();
    const byAddress = new Map<string, IndexEntry>();
    for (const house of parsed.houses ?? []) {
      if (!house?.g) continue;
      const guid = house.g.toLowerCase();
      byGuid.set(guid, house);
      if (house.a) {
        const key = normalizeAddressKey(house.a);
        if (key) byAddress.set(key, house);
      }
    }
    return {
      region: parsed.region || file,
      label: parsed.label || parsed.region || file,
      byGuid,
      byAddress,
    };
  } catch (error) {
    console.error(`[reform-gkh] failed to load ${file}`, error);
    return null;
  }
}

function getIndexes(): RegionIndex[] {
  if (cached) return cached;
  cached = REGION_FILES.map(({ file }) => loadRegion(file)).filter(
    (item): item is RegionIndex => item != null,
  );
  return cached;
}

export function isBashkortostanCity(city: string): boolean {
  const key = cityMatchKey(city);
  if (BASH_CITIES.has(key)) return true;
  return key.includes("башкортостан") || key.includes("башкир");
}

function preferredRegions(city: string): RegionIndex[] {
  const all = getIndexes();
  if (isMoscow(city)) {
    return all.filter((r) => r.region === "moscow");
  }
  if (isBashkortostanCity(city)) {
    return all.filter((r) => r.region === "bashkortostan");
  }
  return all;
}

function toHouse(entry: IndexEntry, index: RegionIndex): ReformGkhHouse {
  return {
    houseguid: entry.g,
    address: entry.a,
    buildingYear: entry.y,
    floors: entry.fl,
    flats: entry.fa,
    electricalLastYear: entry.el,
    electricalNextYear: entry.en,
    region: index.region,
    regionLabel: index.label,
    sourceLabel: `ФРТ / капремонт (${index.label})`,
  };
}

/** Lookup MKD + electrical overhaul years from Reform GKH index. */
export function lookupReformGkhHouse(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): ReformGkhHouse | null {
  const regions = preferredRegions(input.city);
  const fias = input.fiasId?.trim().toLowerCase() || null;
  if (fias && !fias.startsWith("mos:")) {
    for (const region of regions.length ? regions : getIndexes()) {
      const hit = region.byGuid.get(fias);
      if (hit) return toHouse(hit, region);
    }
    // GUID may be in another loaded region
    for (const region of getIndexes()) {
      const hit = region.byGuid.get(fias);
      if (hit) return toHouse(hit, region);
    }
  }

  const addressKey = normalizeAddressKey(input.address);
  if (!addressKey) return null;

  for (const region of regions.length ? regions : getIndexes()) {
    const exact = region.byAddress.get(addressKey);
    if (exact) return toHouse(exact, region);
  }

  // Loose: require house number token + at least one long street token
  const tokens = addressKey.split(" ").filter(Boolean);
  const houseToken = tokens.find((t) => /^\d+[a-zа-я]?$/i.test(t));
  const streetTokens = tokens.filter(
    (t) => t !== houseToken && t.length >= 4 && !/^\d+$/.test(t),
  );
  if (!houseToken || streetTokens.length === 0) return null;

  for (const region of regions.length ? regions : getIndexes()) {
    for (const [key, entry] of region.byAddress) {
      if (!key.includes(houseToken)) continue;
      if (streetTokens.every((token) => key.includes(token))) {
        return toHouse(entry, region);
      }
    }
  }

  return null;
}

export function electricalOverhaulMessage(input: {
  lastYear: number | null;
  nextYear: number | null;
}): string | null {
  const { lastYear, nextYear } = input;
  if (lastYear != null && nextYear != null) {
    return `Внутридомовые сети электроснабжения ремонтировали в ${lastYear} году. Следующий капремонт по программе — около ${nextYear} года.`;
  }
  if (lastYear != null) {
    return `Внутридомовые сети электроснабжения уже ремонтировали в ${lastYear} году.`;
  }
  if (nextYear != null) {
    return `Капремонт внутридомовых сетей электроснабжения в программе на ${nextYear} год.`;
  }
  return null;
}
