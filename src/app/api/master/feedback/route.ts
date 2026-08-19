import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getInstallRequestById,
  upsertMasterFeedback,
  upsertUser,
} from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as {
      requestId?: string;
      userReached?: boolean;
      masterReached?: boolean;
      userScore?: number;
    };

    if (!body.requestId) {
      return Response.json({ error: "requestId required" }, { status: 400 });
    }

    const req = await getInstallRequestById(body.requestId);
    if (!req) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    const isUser = req.telegramUserId === user.telegramId;
    const isMaster = req.masterTelegramId === user.telegramId;
    if (!isUser && !isMaster) {
      return Response.json({ error: "Нет доступа" }, { status: 403 });
    }

    const patch: { userReached?: boolean; masterReached?: boolean; userScore?: number } = {};
    if (isUser) {
      if (typeof body.userReached === "boolean") patch.userReached = body.userReached;
      if (typeof body.userScore === "number" && body.userScore >= 1 && body.userScore <= 5) {
        patch.userScore = body.userScore;
      }
    }
    if (isMaster) {
      if (typeof body.masterReached === "boolean") patch.masterReached = body.masterReached;
    }

    await upsertMasterFeedback(
      body.requestId,
      req.masterTelegramId!,
      req.telegramUserId,
      patch,
    );

    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
