import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getInstallRequestById,
  listMasterTelegramIdsForDispatch,
  markRequestDispatched,
  saveDispatchMessage,
  upsertUser,
} from "@/lib/db";
import {
  dispatchRequestToMasters,
  ensureTelegramWebhook,
} from "@/lib/telegram-notify";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as { requestId?: string };
    if (!body.requestId) {
      return Response.json({ error: "requestId required" }, { status: 400 });
    }

    const req = await getInstallRequestById(body.requestId);
    if (!req || req.telegramUserId !== user.telegramId) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (req.dispatchedAt) {
      return Response.json({ ok: true, alreadyDispatched: true });
    }

    const masterIds = await listMasterTelegramIdsForDispatch();
    if (masterIds.length === 0) {
      return Response.json({ ok: true, mastersCount: 0 });
    }

    await markRequestDispatched(body.requestId);

    const webhook = await ensureTelegramWebhook();
    if (!webhook.ok) {
      console.error("ensureTelegramWebhook failed before master dispatch", webhook);
    } else if (webhook.wasUpdated) {
      console.info("telegram webhook auto-repaired on dispatch", {
        bot: webhook.botUsername,
        url: webhook.webhookUrl,
        previousUrl: webhook.previousUrl,
      });
    }

    const results = await dispatchRequestToMasters(
      masterIds,
      req,
      req.name,
    );

    for (const r of results) {
      await saveDispatchMessage(
        body.requestId,
        r.masterTelegramId,
        r.chatId,
        r.messageId,
      );
    }

    return Response.json({ ok: true, mastersCount: results.length });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
