import {
  authErrorResponse,
  requireTelegramUser,
  AuthError,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getSql,
  getWaitlistSubscription,
  upsertUser,
} from "@/lib/db";
import { notifyAdminWaitlist } from "@/lib/telegram-notify";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidRuPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("8")
    ? digits.slice(1)
    : digits.startsWith("7")
      ? digits.slice(1)
      : digits;
  return national.length === 10;
}

function toRuPhoneE164(value: string): string {
  const digits = value.replace(/\D/g, "");
  const withCountry = digits.startsWith("8")
    ? `7${digits.slice(1)}`
    : digits.startsWith("7")
      ? digits
      : `7${digits}`;
  return `+${withCountry.slice(0, 11)}`;
}

const WAITLIST_KINDS = new Set(["school", "terminals", "launch"]);

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    const list = new URL(request.url).searchParams.get("list");
    if (!list || !WAITLIST_KINDS.has(list)) {
      return Response.json({ error: "Неизвестный список" }, { status: 400 });
    }

    await ensureSchema();
    await upsertUser(user);
    const subscription = await getWaitlistSubscription(user.telegramId, list);
    return Response.json({
      subscribed: Boolean(subscription),
      email: subscription?.email ?? null,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      list?: unknown;
      email?: unknown;
      phone?: unknown;
    };
    const list =
      typeof body.list === "string" && WAITLIST_KINDS.has(body.list)
        ? body.list
        : null;
    const phoneRaw =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const emailRaw =
      typeof body.email === "string" ? body.email.trim() : "";
    const isLaunch = list === "launch";
    const contact = isLaunch
      ? toRuPhoneE164(phoneRaw || emailRaw)
      : emailRaw.toLowerCase();

    if (!list) {
      return Response.json({ error: "Неизвестный список" }, { status: 400 });
    }
    if (isLaunch) {
      if (!isValidRuPhone(phoneRaw || emailRaw)) {
        return Response.json({ error: "Некорректный номер" }, { status: 400 });
      }
    } else if (!isValidEmail(contact)) {
      return Response.json({ error: "Некорректный email" }, { status: 400 });
    }

    await ensureSchema();
    const sql = getSql();

    let telegramId: number | null = null;
    try {
      const user = requireTelegramUser(request);
      await upsertUser(user);
      telegramId = user.telegramId;
      if (!isLaunch) {
        await sql`
          UPDATE users
          SET email = ${contact}, updated_at = NOW()
          WHERE telegram_id = ${telegramId}
            AND (email IS NULL OR email = '')
        `;
      }
    } catch (error) {
      if (!(error instanceof AuthError) || error.status !== 401) {
        throw error;
      }
    }

    await sql`
      INSERT INTO waitlist (id, list, email, telegram_user_id, created_at)
      VALUES (
        ${`w_${list}_${contact}`},
        ${list},
        ${contact},
        ${telegramId},
        NOW()
      )
      ON CONFLICT (list, email) DO UPDATE SET
        telegram_user_id = COALESCE(EXCLUDED.telegram_user_id, waitlist.telegram_user_id),
        created_at = waitlist.created_at
    `;

    try {
      await notifyAdminWaitlist({
        list,
        email: contact,
        telegramUserId: telegramId,
      });
    } catch (error) {
      console.error("notifyAdminWaitlist", error);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
