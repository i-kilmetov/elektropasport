import {
  authErrorResponse,
  requireTelegramUser,
  AuthError,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getSql,
  upsertUser,
} from "@/lib/db";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      list?: unknown;
      email?: unknown;
    };
    const list =
      body.list === "school" || body.list === "terminals" ? body.list : null;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!list) {
      return Response.json({ error: "Неизвестный список" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return Response.json({ error: "Некорректный email" }, { status: 400 });
    }

    await ensureSchema();
    const sql = getSql();

    let telegramId: number | null = null;
    try {
      const user = requireTelegramUser(request);
      await upsertUser(user);
      telegramId = user.telegramId;
      await sql`
        UPDATE users
        SET email = ${email}, updated_at = NOW()
        WHERE telegram_id = ${telegramId}
          AND (email IS NULL OR email = '')
      `;
    } catch (error) {
      if (!(error instanceof AuthError) || error.status !== 401) {
        throw error;
      }
    }

    await sql`
      INSERT INTO waitlist (id, list, email, telegram_user_id, created_at)
      VALUES (
        ${`w_${list}_${email}`},
        ${list},
        ${email},
        ${telegramId},
        NOW()
      )
      ON CONFLICT (list, email) DO UPDATE SET
        telegram_user_id = COALESCE(EXCLUDED.telegram_user_id, waitlist.telegram_user_id),
        created_at = waitlist.created_at
    `;

    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
