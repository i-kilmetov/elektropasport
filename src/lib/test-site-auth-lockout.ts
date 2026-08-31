import { getSql } from "@/lib/sql-client";
import {
  clientIpFromRequest,
  formatRetryAfterMs,
  hashTestSiteClientKey,
  lockoutDurationMs,
  TEST_SITE_MAX_FAILED_ATTEMPTS,
} from "@/lib/test-site-auth";

export type TestSiteLockoutStatus = {
  locked: boolean;
  retryAfterMs?: number;
  message?: string;
};

type GuardRow = {
  failed_attempts: number;
  lockout_level: number;
  locked_until: Date | string | null;
};

let tableReady: Promise<void> | null = null;

async function ensureLockoutTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS test_site_auth_guard (
          ip_hash TEXT PRIMARY KEY,
          failed_attempts INT NOT NULL DEFAULT 0,
          lockout_level INT NOT NULL DEFAULT 0,
          locked_until TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })();
  }
  await tableReady;
}

async function clientKey(request: Request): Promise<string | null> {
  return hashTestSiteClientKey(clientIpFromRequest(request), "test-site-ip");
}

function lockedUntilMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

function lockoutMessage(retryAfterMs: number): string {
  return `Слишком много попыток. Повторите через ${formatRetryAfterMs(retryAfterMs)}.`;
}

export async function getTestSiteLockoutStatus(
  request: Request,
): Promise<TestSiteLockoutStatus> {
  try {
    const ipHash = await clientKey(request);
    if (!ipHash) return { locked: false };

    await ensureLockoutTable();
    const sql = getSql();
    const [row] = (await sql`
      SELECT failed_attempts, lockout_level, locked_until
      FROM test_site_auth_guard
      WHERE ip_hash = ${ipHash}
      LIMIT 1
    `) as GuardRow[];

    if (!row) return { locked: false };

    const lockedUntil = lockedUntilMs(row.locked_until);
    if (lockedUntil != null && lockedUntil > Date.now()) {
      const retryAfterMs = lockedUntil - Date.now();
      return {
        locked: true,
        retryAfterMs,
        message: lockoutMessage(retryAfterMs),
      };
    }

    return { locked: false };
  } catch (error) {
    console.error("getTestSiteLockoutStatus", error);
    return { locked: false };
  }
}

export async function recordTestSiteFailedAttempt(
  request: Request,
): Promise<TestSiteLockoutStatus> {
  try {
    const ipHash = await clientKey(request);
    if (!ipHash) {
      return { locked: false };
    }

    await ensureLockoutTable();
    const sql = getSql();

    const [existing] = (await sql`
      SELECT failed_attempts, lockout_level, locked_until
      FROM test_site_auth_guard
      WHERE ip_hash = ${ipHash}
      LIMIT 1
    `) as GuardRow[];

    const now = Date.now();
    const lockedUntil = lockedUntilMs(existing?.locked_until ?? null);
    if (lockedUntil != null && lockedUntil > now) {
      const retryAfterMs = lockedUntil - now;
      return {
        locked: true,
        retryAfterMs,
        message: lockoutMessage(retryAfterMs),
      };
    }

    const prevFailures = existing?.failed_attempts ?? 0;
    const prevLevel = existing?.lockout_level ?? 0;
    const nextFailures = prevFailures + 1;

    if (nextFailures < TEST_SITE_MAX_FAILED_ATTEMPTS) {
      await sql`
        INSERT INTO test_site_auth_guard (
          ip_hash,
          failed_attempts,
          lockout_level,
          locked_until,
          updated_at
        )
        VALUES (
          ${ipHash},
          ${nextFailures},
          ${prevLevel},
          NULL,
          NOW()
        )
        ON CONFLICT (ip_hash) DO UPDATE SET
          failed_attempts = EXCLUDED.failed_attempts,
          updated_at = NOW()
      `;
      return { locked: false };
    }

    const nextLevel = prevLevel + 1;
    const retryAfterMs = lockoutDurationMs(nextLevel);
    const lockedUntilDate = new Date(now + retryAfterMs);

    await sql`
      INSERT INTO test_site_auth_guard (
        ip_hash,
        failed_attempts,
        lockout_level,
        locked_until,
        updated_at
      )
      VALUES (
        ${ipHash},
        0,
        ${nextLevel},
        ${lockedUntilDate.toISOString()},
        NOW()
      )
      ON CONFLICT (ip_hash) DO UPDATE SET
        failed_attempts = 0,
        lockout_level = EXCLUDED.lockout_level,
        locked_until = EXCLUDED.locked_until,
        updated_at = NOW()
    `;

    return {
      locked: true,
      retryAfterMs,
      message: lockoutMessage(retryAfterMs),
    };
  } catch (error) {
    console.error("recordTestSiteFailedAttempt", error);
    return { locked: false };
  }
}

export async function clearTestSiteLockout(request: Request): Promise<void> {
  try {
    const ipHash = await clientKey(request);
    if (!ipHash) return;

    await ensureLockoutTable();
    const sql = getSql();
    await sql`
      DELETE FROM test_site_auth_guard
      WHERE ip_hash = ${ipHash}
    `;
  } catch (error) {
    console.error("clearTestSiteLockout", error);
  }
}
