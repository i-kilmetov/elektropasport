import { gunzipSync } from "node:zlib";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type GisGkhHouse = {
  fiasId: string;
  buildingYear: number | null;
  walls: string | null;
  managementName: string | null;
  sourceLabel: string;
};

type HouseRow = {
  year: number | null;
  walls: string | null;
  uk: string | null;
};

let db: DatabaseSync | null = null;
let prepareGet:
  | ReturnType<DatabaseSync["prepare"]>
  | null = null;

function indexDir(): string {
  return path.join(process.cwd(), "data", "gis-gkh", "index");
}

function ensureSqliteFile(): string | null {
  const dir = indexDir();
  const sqlitePath = path.join(dir, "mkd.min.sqlite");
  if (existsSync(sqlitePath)) return sqlitePath;

  const gzPath = path.join(dir, "mkd.min.sqlite.gz");
  if (!existsSync(gzPath)) {
    console.error(`[gis-gkh] missing index ${sqlitePath} and ${gzPath}`);
    return null;
  }

  // Prefer writable cache outside the image layer when possible.
  const cacheDir =
    process.env.GIS_GKH_CACHE_DIR?.trim() ||
    path.join(process.env.TMPDIR || "/tmp", "tokom-gis-gkh");
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    // fall through to in-place extract if the image is writable
  }
  const cached = path.join(cacheDir, "mkd.min.sqlite");
  if (existsSync(cached)) return cached;

  try {
    writeFileSync(cached, gunzipSync(readFileSync(gzPath)));
    return cached;
  } catch (error) {
    console.error("[gis-gkh] failed to extract sqlite.gz to cache", error);
  }

  try {
    writeFileSync(sqlitePath, gunzipSync(readFileSync(gzPath)));
    return sqlitePath;
  } catch (error) {
    console.error("[gis-gkh] failed to extract sqlite.gz in place", error);
    return null;
  }
}

function getDb(): DatabaseSync | null {
  if (db) return db;
  const file = ensureSqliteFile();
  if (!file) return null;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    prepareGet = db.prepare(
      "SELECT year, walls, uk FROM houses WHERE fias = ? LIMIT 1",
    );
    return db;
  } catch (error) {
    console.error("[gis-gkh] failed to open sqlite", error);
    db = null;
    prepareGet = null;
    return null;
  }
}

/** Open the FIAS SQLite index (optional warm on boot). */
export function warmGisGkhIndex(): number {
  const opened = getDb();
  if (!opened) return 0;
  try {
    const row = opened.prepare("SELECT COUNT(*) AS n FROM houses").get() as
      | { n: number }
      | undefined;
    return typeof row?.n === "number" ? row.n : 0;
  } catch {
    return 0;
  }
}

export function lookupGisGkhHouse(input: {
  fiasId?: string | null;
}): GisGkhHouse | null {
  const fias = input.fiasId?.trim().toLowerCase() || null;
  if (!fias || fias.startsWith("mos:")) return null;

  if (!getDb() || !prepareGet) return null;

  try {
    const hit = prepareGet.get(fias) as HouseRow | undefined;
    if (!hit) return null;
    return {
      fiasId: fias,
      buildingYear: hit.year ?? null,
      walls: hit.walls ?? null,
      managementName: hit.uk ?? null,
      sourceLabel: "ГИС ЖКХ",
    };
  } catch (error) {
    console.error("[gis-gkh] lookup failed", error);
    return null;
  }
}

/** @deprecated Prefer lookupGisGkhHouse — kept for call-site compatibility. */
export async function lookupGisGkhHouseAsync(input: {
  fiasId?: string | null;
}): Promise<GisGkhHouse | null> {
  return lookupGisGkhHouse(input);
}
