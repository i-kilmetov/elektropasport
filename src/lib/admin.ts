import { requireTelegramUser, type ValidatedTelegramUser } from "@/lib/telegram-auth";
import { DbError, ensureSchema, getSql, upsertUser } from "@/lib/db";

export function ownerAdminTelegramId(): number | null {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d-]/g, "");
  const id = Number(digits);
  return Number.isFinite(id) && id !== 0 ? id : null;
}

export async function isPlatformAdmin(telegramId: number): Promise<boolean> {
  const owner = ownerAdminTelegramId();
  if (owner != null && telegramId === owner) return true;
  const sql = getSql();
  await ensureSchema();
  const [row] = (await sql`
    SELECT is_admin FROM users WHERE telegram_id = ${telegramId}
  `) as Array<{ is_admin: boolean }>;
  return row?.is_admin === true;
}

export async function listAdminTelegramIds(): Promise<number[]> {
  const sql = getSql();
  await ensureSchema();
  const owner = ownerAdminTelegramId();
  const rows = (await sql`
    SELECT telegram_id FROM users WHERE is_admin = TRUE
  `) as Array<{ telegram_id: string | number }>;
  const ids = new Set<number>();
  if (owner != null) ids.add(owner);
  for (const row of rows) ids.add(Number(row.telegram_id));
  return [...ids];
}

export async function requireAdmin(
  request: Request,
): Promise<ValidatedTelegramUser> {
  const user = requireTelegramUser(request);
  await ensureSchema();
  await upsertUser(user);
  const ok = await isPlatformAdmin(user.telegramId);
  if (!ok) {
    throw new DbError("Недостаточно прав", 403);
  }
  return user;
}
