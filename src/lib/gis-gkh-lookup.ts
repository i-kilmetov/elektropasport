import { gunzipSync } from "node:zlib";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { createGunzip } from "node:zlib";

export type GisGkhHouse = {
  fiasId: string;
  buildingYear: number | null;
  walls: string | null;
  managementName: string | null;
  sourceLabel: string;
};

type IndexEntry = {
  y?: number;
  w?: string;
  u?: string;
};

let cached: Map<string, IndexEntry> | null = null;
let loading: Promise<Map<string, IndexEntry>> | null = null;

function indexPath(): string {
  return path.join(process.cwd(), "data", "gis-gkh", "index", "mkd.min.jsonl.gz");
}

async function loadIndexStreaming(): Promise<Map<string, IndexEntry>> {
  const file = indexPath();
  if (!existsSync(file)) {
    console.error(`[gis-gkh] missing index ${file}`);
    return new Map();
  }

  const map = new Map<string, IndexEntry>();
  const stream = createReadStream(file).pipe(createGunzip());
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line) continue;
    try {
      const row = JSON.parse(line) as { g?: string; y?: number; w?: string; u?: string };
      if (!row.g) continue;
      const entry: IndexEntry = {};
      if (typeof row.y === "number") entry.y = row.y;
      if (row.w) entry.w = row.w;
      if (row.u) entry.u = row.u;
      map.set(row.g.toLowerCase(), entry);
    } catch {
      // skip bad line
    }
  }
  return map;
}

function loadIndexSync(): Map<string, IndexEntry> {
  const file = indexPath();
  if (!existsSync(file)) {
    console.error(`[gis-gkh] missing index ${file}`);
    return new Map();
  }
  const text = gunzipSync(readFileSync(file)).toString("utf8");
  const map = new Map<string, IndexEntry>();
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const row = JSON.parse(line) as { g?: string; y?: number; w?: string; u?: string };
      if (!row.g) continue;
      const entry: IndexEntry = {};
      if (typeof row.y === "number") entry.y = row.y;
      if (row.w) entry.w = row.w;
      if (row.u) entry.u = row.u;
      map.set(row.g.toLowerCase(), entry);
    } catch {
      // skip
    }
  }
  return map;
}

async function getIndex(): Promise<Map<string, IndexEntry>> {
  if (cached) return cached;
  if (!loading) {
    loading = loadIndexStreaming()
      .then((map) => {
        cached = map;
        loading = null;
        return map;
      })
      .catch((error) => {
        loading = null;
        console.error("[gis-gkh] failed to load index", error);
        cached = new Map();
        return cached;
      });
  }
  return loading;
}

/** Warm the in-memory FIAS map (optional; first lookup also loads). */
export async function warmGisGkhIndex(): Promise<number> {
  const map = await getIndex();
  return map.size;
}

export async function lookupGisGkhHouse(input: {
  fiasId?: string | null;
}): Promise<GisGkhHouse | null> {
  const fias = input.fiasId?.trim().toLowerCase() || null;
  if (!fias || fias.startsWith("mos:")) return null;

  const map = await getIndex();
  const hit = map.get(fias);
  if (!hit) return null;

  return {
    fiasId: fias,
    buildingYear: hit.y ?? null,
    walls: hit.w ?? null,
    managementName: hit.u ?? null,
    sourceLabel: "ГИС ЖКХ",
  };
}

/** Sync helper for tests / scripts after warm. */
export function lookupGisGkhHouseSync(fiasId: string | null | undefined): GisGkhHouse | null {
  const fias = fiasId?.trim().toLowerCase() || null;
  if (!fias || fias.startsWith("mos:")) return null;
  if (!cached) cached = loadIndexSync();
  const hit = cached.get(fias);
  if (!hit) return null;
  return {
    fiasId: fias,
    buildingYear: hit.y ?? null,
    walls: hit.w ?? null,
    managementName: hit.u ?? null,
    sourceLabel: "ГИС ЖКХ",
  };
}
