import { dbErrorResponse, ensureSchema, recordInviteLinkHit } from "@/lib/db";
import { isInviteToken } from "@/lib/invites";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: unknown;
      visitorKey?: unknown;
    };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const visitorKey =
      typeof body.visitorKey === "string" ? body.visitorKey.trim() : "";
    if (!isInviteToken(token) || !visitorKey) {
      return Response.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    await ensureSchema();
    const result = await recordInviteLinkHit(token, visitorKey);
    return Response.json(result);
  } catch (error) {
    return dbErrorResponse(error) ?? Response.json({ ok: false }, { status: 500 });
  }
}
