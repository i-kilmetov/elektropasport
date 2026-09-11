import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type TariffMeterType = import("@/lib/electricity-tariffs-format").TariffMeterType;

export type TariffGroupId = "urban" | "urbanElectricStove" | "rural";

export type TariffPeriod = {
  from: string;
  to: string;
  label: string;
};

type RateMatrix = Array<Array<number | null>>;

export type TariffGroupRates = {
  single: RateMatrix;
  dual: { day: RateMatrix; night: RateMatrix };
  triple: { peak: RateMatrix; mid: RateMatrix; night: RateMatrix };
};

export type RegionTariffs = {
  id: string;
  label: string;
  aliases: string[];
  sourceUrl: string;
  sourceDoc: string | null;
  sourceSite: string;
  rangeCount: number;
  periods: TariffPeriod[];
  groups: Record<TariffGroupId, TariffGroupRates>;
};

type TariffIndex = {
  version: number;
  scrapedAt: string;
  sourceIndexUrl: string;
  regionCount: number;
  regions: Record<string, RegionTariffs>;
};

export type ResolvedElectricityTariffs = {
  regionId: string;
  regionLabel: string;
  period: TariffPeriod;
  periodIndex: number;
  rangeCount: number;
  rangeIndex: number;
  groupId: TariffGroupId;
  groupLabel: string;
  sourceUrl: string;
  sourceDoc: string | null;
  scrapedAt: string;
  single: number | null;
  dual: { day: number | null; night: number | null };
  triple: {
    peak: number | null;
    mid: number | null;
    night: number | null;
  };
};

let indexCache: TariffIndex | null = null;
let aliasMap: Map<string, string> | null = null;

function indexPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "electricity-tariffs",
    "index",
    "regions.min.json",
  );
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPlaceNoise(value: string): string {
  return value
    .replace(
      /^(г|гор\.?|город|респ\.?|республика|край|область|ао|округ)\s+/i,
      "",
    )
    .replace(
      /\s+(область|край|республика|ао|автономный округ|г)$/i,
      "",
    )
    .trim();
}

function loadIndex(): TariffIndex | null {
  if (indexCache) return indexCache;
  const file = indexPath();
  if (!existsSync(file)) {
    console.error(`[electricity-tariffs] missing ${file}`);
    return null;
  }
  try {
    indexCache = JSON.parse(readFileSync(file, "utf8")) as TariffIndex;
    return indexCache;
  } catch (error) {
    console.error("[electricity-tariffs] failed to parse index", error);
    return null;
  }
}

function buildAliasMap(index: TariffIndex): Map<string, string> {
  const map = new Map<string, string>();
  const put = (alias: string, id: string) => {
    const key = normalizeKey(alias);
    if (!key) return;
    if (!map.has(key)) map.set(key, id);
    const stripped = normalizeKey(stripPlaceNoise(alias));
    if (stripped && !map.has(stripped)) map.set(stripped, id);
  };

  for (const [id, region] of Object.entries(index.regions)) {
    put(id, id);
    put(region.label, id);
    for (const alias of region.aliases) put(alias, id);
    // Extra short forms from slug: moskva → москва via transliteration not needed;
    // add common city words from label before "и".
    const head = region.label.split(/\s+и\s+/)[0]?.trim();
    if (head) put(head, id);
  }

  // Hard aliases for frequent lookups.
  const extras: Array<[string, string]> = [
    ["москва", "moskva"],
    ["город москва", "moskva"],
    ["московская область", "moskva-obl"],
    ["санкт петербург", "st-peterburg"],
    ["петербург", "st-peterburg"],
    ["спб", "st-peterburg"],
    ["башкортостан", "ufa-resp"],
    ["республика башкортостан", "ufa-resp"],
    ["татарстан", "tatarstan-resp"],
    ["крым", "krym-resp"],
    ["севастополь", "sevastopol"],
  ];
  for (const [alias, id] of extras) {
    if (index.regions[id]) put(alias, id);
  }
  return map;
}

export function findTariffRegionId(input: {
  region?: string | null;
  city?: string | null;
}): string | null {
  const index = loadIndex();
  if (!index) return null;
  if (!aliasMap) aliasMap = buildAliasMap(index);

  const candidates = [input.region, input.city].filter(
    (v): v is string => Boolean(v?.trim()),
  );
  for (const raw of candidates) {
    const key = normalizeKey(raw);
    const hit = aliasMap.get(key) || aliasMap.get(normalizeKey(stripPlaceNoise(raw)));
    if (hit) return hit;
  }
  // Fuzzy contains: region label includes city
  for (const raw of candidates) {
    const key = normalizeKey(stripPlaceNoise(raw));
    if (key.length < 4) continue;
    for (const [alias, id] of aliasMap) {
      if (alias.includes(key) || key.includes(alias)) return id;
    }
  }
  return null;
}

function pickPeriodIndex(periods: TariffPeriod[], on = new Date()): number {
  const iso = on.toISOString().slice(0, 10);
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (p.from <= iso && iso <= p.to) return i;
  }
  return Math.max(0, periods.length - 1);
}

function cellAt(matrix: RateMatrix, periodIndex: number, rangeIndex: number): number | null {
  const row = matrix[periodIndex];
  if (!row) return null;
  const value = row[Math.min(rangeIndex, Math.max(0, row.length - 1))];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function groupLabel(id: TariffGroupId): string {
  if (id === "urbanElectricStove") return "Город, дома с электроплитами";
  if (id === "rural") return "Сельская местность";
  return "Город (газ / без электроплит)";
}

export function resolveElectricityTariffs(input: {
  region?: string | null;
  city?: string | null;
  regionId?: string | null;
  electricStove?: boolean | null;
  rural?: boolean | null;
  rangeIndex?: number;
  on?: Date;
}): ResolvedElectricityTariffs | null {
  const index = loadIndex();
  if (!index) return null;

  const regionId =
    input.regionId?.trim() ||
    findTariffRegionId({ region: input.region, city: input.city });
  if (!regionId) return null;
  const region = index.regions[regionId];
  if (!region) return null;

  const periodIndex = pickPeriodIndex(region.periods, input.on ?? new Date());
  const period = region.periods[periodIndex];
  if (!period) return null;

  const groupId: TariffGroupId = input.rural
    ? "rural"
    : input.electricStove
      ? "urbanElectricStove"
      : "urban";
  const group = region.groups[groupId] ?? region.groups.urban;
  const rangeIndex = Math.max(
    0,
    Math.min(input.rangeIndex ?? 0, Math.max(0, region.rangeCount - 1)),
  );

  return {
    regionId: region.id,
    regionLabel: region.label,
    period,
    periodIndex,
    rangeCount: region.rangeCount,
    rangeIndex,
    groupId,
    groupLabel: groupLabel(groupId),
    sourceUrl: region.sourceUrl,
    sourceDoc: region.sourceDoc,
    scrapedAt: index.scrapedAt,
    single: cellAt(group.single, periodIndex, rangeIndex),
    dual: {
      day: cellAt(group.dual.day, periodIndex, rangeIndex),
      night: cellAt(group.dual.night, periodIndex, rangeIndex),
    },
    triple: {
      peak: cellAt(group.triple.peak, periodIndex, rangeIndex),
      mid: cellAt(group.triple.mid, periodIndex, rangeIndex),
      night: cellAt(group.triple.night, periodIndex, rangeIndex),
    },
  };
}

export function formatRubPerKwh(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2).replace(".", ",")} ₽/кВт·ч`;
}

export function ratesFromResolved(
  resolved: ResolvedElectricityTariffs,
): {
  single: number | null;
  dualDay: number | null;
  dualNight: number | null;
  triplePeak: number | null;
  tripleMid: number | null;
  tripleNight: number | null;
} {
  return {
    single: resolved.single,
    dualDay: resolved.dual.day,
    dualNight: resolved.dual.night,
    triplePeak: resolved.triple.peak,
    tripleMid: resolved.triple.mid,
    tripleNight: resolved.triple.night,
  };
}

/** Build a panel snapshot payload with all three consumer groups for client toggle. */
export function buildHouseTariffSnapshot(input: {
  region?: string | null;
  city?: string | null;
  regionId?: string | null;
}): import("@/lib/house-insight").HouseElectricityTariffSnapshot | null {
  const urban = resolveElectricityTariffs({ ...input, electricStove: false });
  if (!urban) return null;
  const stove =
    resolveElectricityTariffs({ ...input, electricStove: true }) ?? urban;
  const rural =
    resolveElectricityTariffs({ ...input, rural: true }) ?? urban;
  return {
    regionId: urban.regionId,
    regionLabel: urban.regionLabel,
    periodFrom: urban.period.from,
    periodTo: urban.period.to,
    periodLabel: urban.period.label,
    rangeCount: urban.rangeCount,
    rangeIndex: urban.rangeIndex,
    sourceUrl: urban.sourceUrl,
    sourceDoc: urban.sourceDoc,
    urban: ratesFromResolved(urban),
    urbanElectricStove: ratesFromResolved(stove),
    rural: ratesFromResolved(rural),
  };
}
