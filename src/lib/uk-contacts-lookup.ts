import { gunzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type UkContact = {
  name: string;
  phone: string | null;
  email: string | null;
  inn: string | null;
  ogrn: string | null;
  func: string | null;
};

type ContactRow = {
  name: string | null;
  phone: string | null;
  email: string | null;
  inn: string | null;
  ogrn: string | null;
  func: string | null;
};

let db: DatabaseSync | null = null;
let prepareGet: ReturnType<DatabaseSync["prepare"]> | null = null;

function indexDir(): string {
  return path.join(process.cwd(), "data", "gis-gkh", "index");
}

/** Normalize UK name the same way as scripts/build-uk-contacts-index.py */
export function normalizeUkNameKey(value: string): string {
  // Keep legal form (ООО/ТСЖ…) so ООО «Танаис» ≠ ЖК «Танаис».
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureSqliteFile(): string | null {
  const dir = indexDir();
  const sqlitePath = path.join(dir, "uk-contacts.min.sqlite");
  if (existsSync(sqlitePath)) return sqlitePath;

  const gzPath = path.join(dir, "uk-contacts.min.sqlite.gz");
  if (!existsSync(gzPath)) {
    console.error(`[uk-contacts] missing index ${sqlitePath} and ${gzPath}`);
    return null;
  }

  const cacheDir =
    process.env.UK_CONTACTS_CACHE_DIR?.trim() ||
    path.join(process.env.TMPDIR || "/tmp", "tokom-uk-contacts");
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    // ignore
  }
  const cached = path.join(cacheDir, "uk-contacts.min.sqlite");
  if (existsSync(cached)) return cached;

  try {
    writeFileSync(cached, gunzipSync(readFileSync(gzPath)));
    return cached;
  } catch (error) {
    console.error("[uk-contacts] failed to extract sqlite.gz to cache", error);
  }

  try {
    writeFileSync(sqlitePath, gunzipSync(readFileSync(gzPath)));
    return sqlitePath;
  } catch (error) {
    console.error("[uk-contacts] failed to extract sqlite.gz in place", error);
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
      "SELECT name, phone, email, inn, ogrn, func FROM contacts WHERE name_key = ? LIMIT 1",
    );
    return db;
  } catch (error) {
    console.error("[uk-contacts] failed to open sqlite", error);
    db = null;
    prepareGet = null;
    return null;
  }
}

export function warmUkContactsIndex(): number {
  const opened = getDb();
  if (!opened) return 0;
  try {
    const row = opened.prepare("SELECT COUNT(*) AS n FROM contacts").get() as
      | { n: number }
      | undefined;
    return typeof row?.n === "number" ? row.n : 0;
  } catch {
    return 0;
  }
}

/** Lookup phone/email/INN/OGRN for a UK name from GIS ЖКХ house passport. */
export function lookupUkContact(ukName: string | null | undefined): UkContact | null {
  const raw = ukName?.trim() || "";
  if (!raw) return null;
  const key = normalizeUkNameKey(raw);
  if (!key || !getDb() || !prepareGet) return null;

  try {
    const hit = prepareGet.get(key) as ContactRow | undefined;
    if (!hit) return null;
    return {
      name: hit.name?.trim() || raw,
      phone: hit.phone?.trim() || null,
      email: hit.email?.trim() || null,
      inn: hit.inn?.trim() || null,
      ogrn: hit.ogrn?.trim() || null,
      func: hit.func?.trim() || null,
    };
  } catch (error) {
    console.error("[uk-contacts] lookup failed", error);
    return null;
  }
}
