import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  claimInvite,
  dbErrorResponse,
  ensureSchema,
  upsertUser,
} from "@/lib/db";
import { isInviteToken } from "@/lib/invites";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      token?: unknown;
    };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isInviteToken(token)) {
      return Response.json({ error: "Некорректное приглашение" }, { status: 400 });
    }

    await ensureSchema();
    const { isNew } = await upsertUser(user);
    const quota = await claimInvite(user, token, isNew);
    return Response.json({ quota });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
