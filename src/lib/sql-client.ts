import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import postgres from "postgres";
import { DbError } from "@/lib/db-error";

export type SqlClient = NeonQueryFunction<false, false>;

let pgClient: ReturnType<typeof postgres> | null = null;

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

export function getSql(): SqlClient {
  const url = resolveDatabaseUrl();

  if (isNeonUrl(url)) {
    return neon(url) as SqlClient;
  }

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
