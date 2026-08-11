import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  insertMasterApplication,
  upsertUser,
} from "@/lib/db";
import { notifyAdminMasterApplication } from "@/lib/telegram-notify";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as {
      id?: string;
      city?: string;
      contactMethod?: "phone" | "telegram";
      phone?: string;
      name?: string;
    };

    if (!body.id || !body.city || !body.contactMethod || !body.name) {
      return Response.json(
        { error: "Некорректные данные заявки мастера" },
        { status: 400 },
      );
    }

    await insertMasterApplication(user.telegramId, {
      id: body.id,
      city: body.city,
      contactMethod: body.contactMethod,
      phone: body.phone,
      name: body.name,
    });

    // Must await: Vercel freezes the function after the response is sent.
    try {
      await notifyAdminMasterApplication({
        id: body.id,
        city: body.city,
        contactMethod: body.contactMethod,
        phone: body.phone,
        name: body.name,
        customerTelegramId: user.telegramId,
      });
    } catch (error) {
      console.error("Failed to notify admin about master application", error);
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
