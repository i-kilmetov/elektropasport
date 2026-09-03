import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getUserRole,
  listMasterExchangeRequests,
  upsertUser,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const role = await getUserRole(user.telegramId);
    if (role !== "master") {
      return Response.json({ error: "Не мастер" }, { status: 403 });
    }

    const requests = await listMasterExchangeRequests(user.telegramId);
    return Response.json({ requests });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
