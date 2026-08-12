import { pollBrowserAuthSession } from "@/lib/browser-auth-sessions";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { signSessionToken } from "@/lib/session-token";

export async function GET(request: Request) {
  try {
    const pollToken = new URL(request.url).searchParams.get("token")?.trim();
    if (!pollToken) {
      return Response.json({ error: "token обязателен" }, { status: 400 });
    }

    const user = await pollBrowserAuthSession(pollToken);
    if (!user) {
      return Response.json({ status: "pending" as const });
    }

    await ensureSchema();
    await upsertUser({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    });

    const token = signSessionToken({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    });

    return Response.json({
      status: "complete" as const,
      token,
      user: {
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    });
  } catch (error) {
    return (
      dbErrorResponse(error) ??
      Response.json({ error: "Не удалось проверить вход" }, { status: 500 })
    );
  }
}
