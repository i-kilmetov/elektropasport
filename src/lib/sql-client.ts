import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import postgres, { type JSONValue, type ParameterOrFragment } from "postgres";
import { DbError } from "@/lib/db-error";

export type SqlClient = NeonQueryFunction<false, false>;

let pgClient: ReturnType<typeof postgres> | null = null;
let sqlDriver: "neon" | "postgres" = "neon";

function isNeonUrl(url: string): boolean {
  return /neon\.tech|neondb\.|\.neon\./i.test(url);
}

/** Primary DB URL: Russian hosting first (152-FZ), then legacy DATABASE_URL. */
export function resolveDatabaseUrl(): string {
  const ru = process.env.RU_DATABASE_URL?.trim();
  if (ru) return ru;
  const legacy = process.env.DATABASE_URL?.trim();
  if (legacy) return legacy;
  throw new DbError(
    "RU_DATABASE_URL (рекомендуется) или DATABASE_URL не настроен на сервере",
    503,
  );
}

export function isRussianDatabaseConfigured(): boolean {
  return Boolean(process.env.RU_DATABASE_URL?.trim());
}

/**
 * Bind a JSON/JSONB value for both Neon and postgres.js.
 * Never JSON.stringify first: postgres.js would double-encode and store a
 * jsonb *string*, so Array.isArray() fails on read and sync looks empty.
 */
export function jsonbParam(
  value: unknown,
): ParameterOrFragment<never> | string | null {
  if (value === undefined) return null;
  const sanitized = JSON.parse(JSON.stringify(value)) as JSONValue | null;
  if (sqlDriver === "postgres" && pgClient) {
    return pgClient.json(sanitized as JSONValue);
  }
  // Neon HTTP driver: text + ::jsonb in SQL parses once into real jsonb.
  return JSON.stringify(sanitized);
}

/** Bind BYTEA for postgres.js (Buffer) and Neon HTTP (hex text + ::bytea). */
export function byteaParam(bytes: Uint8Array): Buffer | string {
  const buf = Buffer.from(bytes);
  if (sqlDriver === "postgres") return buf;
  return `\\x${buf.toString("hex")}`;
}

export function bytesFromBytea(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value && typeof value === "object" && "data" in value) {
    const rec = value as { type?: unknown; data?: unknown };
    if (rec.type === "Buffer" && Array.isArray(rec.data)) {
      return Buffer.from(rec.data as number[]);
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const hex = trimmed.replace(/^\\+x/i, "");
    if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
      return Buffer.from(hex, "hex");
    }
    return Buffer.from(trimmed, "base64");
  }
  throw new Error("Некорректные данные фото");
}

export function getSql(): SqlClient {
  const url = resolveDatabaseUrl();

  if (isNeonUrl(url)) {
    sqlDriver = "neon";
    return neon(url) as SqlClient;
  }

  sqlDriver = "postgres";
  if (!pgClient) {
    pgClient = postgres(url, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
    });
  }

  return pgClient as unknown as SqlClient;
}
