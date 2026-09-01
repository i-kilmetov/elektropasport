import { appEnvFromRequest } from "@/lib/app-env";
import {
  dbErrorResponse,
  ensureSchema,
  getPhoneAuthChallenge,
} from "@/lib/db";
import { isInviteToken } from "@/lib/invites";
import {
  finishPhoneAuthLogin,
  PhoneAuthError,
  phoneAuthErrorResponse,
} from "@/lib/phone-auth-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      challengeId?: unknown;
      code?: unknown;
      inviteToken?: unknown;
    };

    const challengeId =
      typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const inviteToken =
      typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";

    if (!challengeId) {
      throw new PhoneAuthError("Не указан идентификатор проверки", 400);
    }
    if (!/^\d{4,8}$/.test(code)) {
      throw new PhoneAuthError("Введите код из Telegram", 400);
    }
    if (inviteToken && !isInviteToken(inviteToken)) {
      throw new PhoneAuthError("Некорректное приглашение", 400);
    }

    await ensureSchema();
    const challenge = await getPhoneAuthChallenge(challengeId);
    if (!challenge) {
      throw new PhoneAuthError("Сессия входа не найдена — запросите код снова", 404);
    }

    const result = await finishPhoneAuthLogin({
      challenge,
      code,
      appEnv: appEnvFromRequest(request),
      inviteToken: inviteToken || null,
    });

    return Response.json(result);
  } catch (error) {
    return dbErrorResponse(error) ?? phoneAuthErrorResponse(error);
  }
}
