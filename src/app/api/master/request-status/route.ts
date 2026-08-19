import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getInstallRequestById,
  getRequestAcceptedMaster,
  upsertUser,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");
    if (!requestId) {
      return Response.json({ error: "requestId required" }, { status: 400 });
    }

    const req = await getInstallRequestById(requestId);
    if (!req || req.telegramUserId !== user.telegramId) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (!req.masterTelegramId) {
      return Response.json({ status: "searching" });
    }

    const master = await getRequestAcceptedMaster(requestId);
    return Response.json({
      status: "accepted",
      master: master
        ? {
            firstName: master.firstName,
            phone: master.phone,
            username: master.username,
          }
        : null,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
