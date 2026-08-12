import { randomBytes } from "crypto";
import { ensureSchema, getSql } from "@/lib/db";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";

const SESSION_TTL_MIN = 10;

export type BrowserAuthSession = {
  pollToken: string;
  startCode: string;
  botUrl: string;
};

export type CompletedBrowserAuth = {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
};

function buildStartCode(): string {
  return `webauth_${randomBytes(8).toString("hex")}`;
}

export async function createBrowserAuthSession(
  botUsername: string,
): Promise<BrowserAuthSession> {
  await ensureSchema();
  const sql = getSql();
  const pollToken = randomBytes(16).toString("hex");
  const startCode = buildStartCode();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MIN * 60 * 1000);

  await sql`
    DELETE FROM browser_auth_sessions
    WHERE expires_at < NOW()
  `;

  await sql`
    INSERT INTO browser_auth_sessions (
      poll_token, start_code, expires_at
    ) VALUES (
      ${pollToken},
      ${startCode},
      ${expiresAt.toISOString()}
    )
  `;

  return {
    pollToken,
    startCode,
    botUrl: `https://t.me/${botUsername}?start=${startCode}`,
  };
}

export async function completeBrowserAuthSession(
  startCode: string,
  user: ValidatedTelegramUser,
): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    UPDATE browser_auth_sessions
    SET
      telegram_user_id = ${user.telegramId},
      first_name = ${user.firstName ?? null},
      last_name = ${user.lastName ?? null},
      username = ${user.username ?? null}
    WHERE start_code = ${startCode}
      AND expires_at > NOW()
      AND telegram_user_id IS NULL
    RETURNING poll_token
  `) as Array<{ poll_token: string }>;

  return rows.length > 0;
}

export async function pollBrowserAuthSession(
  pollToken: string,
): Promise<CompletedBrowserAuth | null> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT
      telegram_user_id,
      first_name,
      last_name,
      username
    FROM browser_auth_sessions
    WHERE poll_token = ${pollToken}
      AND expires_at > NOW()
      AND telegram_user_id IS NOT NULL
    LIMIT 1
  `) as Array<{
    telegram_user_id: string | number;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  }>;

  if (rows.length === 0) return null;

  const row = rows[0];
  await sql`
    DELETE FROM browser_auth_sessions
    WHERE poll_token = ${pollToken}
  `;

  return {
    telegramId: Number(row.telegram_user_id),
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    username: row.username ?? undefined,
  };
}

export function parseWebAuthStartCode(text: string | undefined): string | null {
  if (!text) return null;
  const match = /^\/start\s+(webauth_[a-f0-9]+)$/i.exec(text.trim());
  return match?.[1] ?? null;
}
