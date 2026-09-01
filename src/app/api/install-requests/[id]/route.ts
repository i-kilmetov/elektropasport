import { isAiConsultationRequest, type InstallRequest } from "@/types";
import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deleteInstallRequest,
  ensureSchema,
  getInstallRequestById,
  updateInstallRequest,
  upsertUser,
} from "@/lib/db";
import {
  notifyAdminInstallRequestDeletedByUser,
  notifyAdminInstallRequestStatusChangedByUser,
} from "@/lib/telegram-notify";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const body = (await request.json()) as Partial<
      Pick<
        InstallRequest,
        | "title"
        | "status"
        | "statusLabel"
        | "exactAddress"
        | "paymentStatus"
        | "paidAmountRub"
      >
    >;
    const item = await updateInstallRequest(user.telegramId, id, body);
    if (!item) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (body.status && !isAiConsultationRequest(item)) {
      try {
        await notifyAdminInstallRequestStatusChangedByUser(
          item,
          user.telegramId,
          { username: user.username },
        );
      } catch (error) {
        console.error("Failed to notify admin about status change", error);
      }
    }

    return Response.json({ request: item });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const existing = await getInstallRequestById(id);
    if (!existing || existing.telegramUserId !== user.telegramId) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    const ok = await deleteInstallRequest(user.telegramId, id);
    if (!ok) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    try {
      if (!isAiConsultationRequest(existing)) {
        await notifyAdminInstallRequestDeletedByUser(existing, user.telegramId, {
          username: user.username,
        });
      }
    } catch (error) {
      console.error("Failed to notify admin about deleted request", error);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
