import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deletePushSubscription,
  ensureSchema,
  upsertPushSubscription,
  upsertUser,
} from "@/lib/db";

export const runtime = "nodejs";

function readEndpoint(body: Record<string, unknown>): string {
  const endpoint =
    typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint.startsWith("https://")) {
    throw new Error("Некорректная подписка");
  }
  return endpoint;
}

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as Record<string, unknown>;
    const endpoint = readEndpoint(body);
    const keys =
      body.keys && typeof body.keys === "object"
        ? (body.keys as Record<string, unknown>)
        : {};
    const p256dh = typeof keys.p256dh === "string" ? keys.p256dh.trim() : "";
    const auth = typeof keys.auth === "string" ? keys.auth.trim() : "";
    if (!p256dh || !auth) {
      return Response.json({ error: "Некорректные ключи подписки" }, { status: 400 });
    }

    await upsertPushSubscription(user.telegramId, {
      endpoint,
      p256dh,
      auth,
      userAgent:
        typeof body.userAgent === "string"
          ? body.userAgent.slice(0, 400)
          : request.headers.get("user-agent")?.slice(0, 400) ?? undefined,
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Некорректная подписка") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const endpoint = readEndpoint(body);
    await deletePushSubscription(user.telegramId, endpoint);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Некорректная подписка") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
