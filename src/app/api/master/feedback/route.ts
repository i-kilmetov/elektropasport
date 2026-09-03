import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  clearWiringReviewPending,
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
      clearWiringReview?: boolean;
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

    const patch: {
      userReached?: boolean;
      masterReached?: boolean;
      userScore?: number;
    } = {};
    if (isUser) {
      if (typeof body.userReached === "boolean") patch.userReached = body.userReached;
      if (
        typeof body.userScore === "number" &&
        body.userScore >= 1 &&
        body.userScore <= 5
      ) {
        patch.userScore = body.userScore;
      }
    }
    if (isMaster) {
      if (typeof body.masterReached === "boolean") {
        patch.masterReached = body.masterReached;
      }
    }

    if (Object.keys(patch).length > 0) {
      if (!req.masterTelegramId) {
        return Response.json({ error: "Мастер не назначен" }, { status: 400 });
      }
      await upsertMasterFeedback(
        body.requestId,
        req.masterTelegramId,
        req.telegramUserId,
        patch,
      );
    }

    if (
      isUser &&
      (body.clearWiringReview === true || typeof patch.userScore === "number")
    ) {
      await clearWiringReviewPending(user.telegramId, body.requestId);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
