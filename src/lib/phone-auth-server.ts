import type { AppEnv } from "@/lib/app-env";
import { toTelegramChatId } from "@/lib/app-env";
import {
  claimInvite,
  ensurePhoneAuthUser,
  markPhoneAuthChallengeVerified,
  type PhoneAuthChallenge,
} from "@/lib/db";
import { isInviteToken } from "@/lib/invites";
import { isTelegramGatewayConfigured } from "@/lib/phone-auth";
import { gatewayCheckVerificationStatus } from "@/lib/telegram-gateway";
import { signSessionToken } from "@/lib/session-token";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";

export type PhoneAuthLoginResult = {
  token: string;
  user: {
    telegramId: number;
    firstName?: string;
    lastName?: string;
  };
  quota?: Awaited<ReturnType<typeof claimInvite>>;
};

export function assertPhoneAuthAvailable(): void {
  if (!isTelegramGatewayConfigured()) {
    throw new PhoneAuthError(
      "Вход по телефону временно недоступен",
      503,
    );
  }
}

export class PhoneAuthError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PhoneAuthError";
    this.status = status;
  }
}

export function phoneAuthErrorResponse(error: unknown): Response {
  if (error instanceof PhoneAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
}

export async function finishPhoneAuthLogin(input: {
  challenge: PhoneAuthChallenge;
  code: string;
  appEnv: AppEnv;
  inviteToken?: string | null;
}): Promise<PhoneAuthLoginResult> {
  assertPhoneAuthAvailable();

  if (input.challenge.verifiedAt) {
    throw new PhoneAuthError("Код уже использован — запросите новый", 400);
  }

  const expiresAt = Date.parse(input.challenge.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    throw new PhoneAuthError("Код истёк — запросите новый", 400);
  }

  if (input.challenge.appEnv !== input.appEnv) {
    throw new PhoneAuthError("Сессия другого окружения", 400);
  }

  const status = await gatewayCheckVerificationStatus(
    input.challenge.gatewayRequestId,
    input.code.trim(),
  );
  if (status.verification_status.status !== "code_valid") {
    throw new PhoneAuthError("Неверный код", 400);
  }

  await markPhoneAuthChallengeVerified(input.challenge.id);

  const { storageId, isNew } = await ensurePhoneAuthUser({
    phoneDigits: input.challenge.phoneDigits,
    appEnv: input.appEnv,
  });

  const chatId = toTelegramChatId(storageId);
  const token = signSessionToken({
    telegramId: chatId,
    appEnv: input.appEnv,
    firstName: "Пользователь",
  });

  const displayUser: ValidatedTelegramUser = {
    telegramId: chatId,
    firstName: "Пользователь",
    appEnv: input.appEnv,
  };

  let quota: PhoneAuthLoginResult["quota"];
  const inviteToken = input.inviteToken?.trim();
  if (isInviteToken(inviteToken)) {
    quota = await claimInvite(
      { telegramId: storageId, firstName: displayUser.firstName },
      inviteToken,
      isNew,
    );
  }

  return {
    token,
    user: {
      telegramId: chatId,
      firstName: displayUser.firstName,
    },
    quota,
  };
}
