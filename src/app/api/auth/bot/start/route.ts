import { createBrowserAuthSession } from "@/lib/browser-auth-sessions";
import { dbErrorResponse } from "@/lib/db";

export async function POST() {
  try {
    const botUsername =
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ??
      process.env.TELEGRAM_BOT_USERNAME?.trim();

    if (!botUsername) {
      return Response.json(
        { error: "Username бота не настроен на сервере" },
        { status: 503 },
      );
    }

    const session = await createBrowserAuthSession(botUsername);
    return Response.json(session);
  } catch (error) {
    return (
      dbErrorResponse(error) ??
      Response.json({ error: "Не удалось начать вход" }, { status: 500 })
    );
  }
}
