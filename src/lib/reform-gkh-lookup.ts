import { gunzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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

type HouseRow = {
  year: number | null;
  floors: number | null;
  flats: number | null;
  el: number | null;
  en: number | null;
  region: string | null;
};

let db: DatabaseSync | null = null;
let prepareGet: ReturnType<DatabaseSync["prepare"]> | null = null;

function indexDir(): string {
  return path.join(process.cwd(), "data", "reform-gkh", "index");
}

function ensureSqliteFile(): string | null {
  const dir = indexDir();
  const sqlitePath = path.join(dir, "electrical.min.sqlite");
  if (existsSync(sqlitePath)) return sqlitePath;

  const gzPath = path.join(dir, "electrical.min.sqlite.gz");
  if (!existsSync(gzPath)) {
    console.error(`[reform-gkh] missing index ${sqlitePath} and ${gzPath}`);
    return null;
  }

  const cacheDir =
    process.env.REFORM_GKH_CACHE_DIR?.trim() ||
    path.join(process.env.TMPDIR || "/tmp", "tokom-reform-gkh");
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    // ignore
  }
  const cached = path.join(cacheDir, "electrical.min.sqlite");
  if (existsSync(cached)) return cached;

  try {
    writeFileSync(cached, gunzipSync(readFileSync(gzPath)));
    return cached;
  } catch (error) {
    console.error("[reform-gkh] failed to extract sqlite.gz to cache", error);
  }

  try {
    writeFileSync(sqlitePath, gunzipSync(readFileSync(gzPath)));
    return sqlitePath;
  } catch (error) {
    console.error("[reform-gkh] failed to extract sqlite.gz in place", error);
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
      "SELECT year, floors, flats, el, en, region FROM houses WHERE fias = ? LIMIT 1",
    );
    return db;
  } catch (error) {
    console.error("[reform-gkh] failed to open sqlite", error);
    db = null;
    prepareGet = null;
    return null;
  }
}

export function warmReformGkhIndex(): number {
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

/** Lookup electrical overhaul years from Reform GKH by house FIAS. */
export function lookupReformGkhHouse(input: {
  city: string;
  address: string;
  fiasId?: string | null;
}): ReformGkhHouse | null {
  const fias = input.fiasId?.trim().toLowerCase() || null;
  if (!fias || fias.startsWith("mos:")) return null;
  if (!getDb() || !prepareGet) return null;

  try {
    const hit = prepareGet.get(fias) as HouseRow | undefined;
    if (!hit) return null;
    const regionLabel = hit.region?.trim() || "РФ";
    return {
      houseguid: fias,
      address: input.address,
      buildingYear: hit.year ?? null,
      floors: hit.floors ?? null,
      flats: hit.flats ?? null,
      electricalLastYear: hit.el ?? null,
      electricalNextYear: hit.en ?? null,
      region: regionLabel,
      regionLabel,
      sourceLabel: `ФРТ / капремонт (${regionLabel})`,
    };
  } catch (error) {
    console.error("[reform-gkh] lookup failed", error);
    return null;
  }
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
