import {
  toStorageTelegramId,
  toTelegramChatId,
  type AppEnv,
} from "@/lib/app-env";
import {
  ensureSchema,
  getStoredUserProfile,
  recordUserPdConsent,
  updateStoredUserProfile,
  upsertUser,
  userHasPdConsent,
} from "@/lib/db";
import {
  isPdConsentCookieValid,
  PD_CONSENT_VERSION,
  readPdConsentCookie,
} from "@/lib/pd-consent";
import { signSessionToken } from "@/lib/session-token";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";

export type EstablishedSession = {
  token: string;
  user: ValidatedTelegramUser;
  /** True when the PD consent cookie should be (re)issued on the response. */
  pdConsent: boolean;
};

/**
 * Persists the Telegram user for the given app env and mints a session token.
 * Shared by the OAuth callback and the browser-side code exchange.
 */
export async function establishTelegramSession(
  user: ValidatedTelegramUser,
  request: Request,
  env: AppEnv,
): Promise<EstablishedSession> {
  const realTelegramId = toTelegramChatId(user.telegramId);
  const storageUser: ValidatedTelegramUser = {
    ...user,
    telegramId: toStorageTelegramId(realTelegramId, env),
    appEnv: env,
  };

  await ensureSchema();
  await upsertUser(storageUser);

  const consentVersion = readPdConsentCookie(request);
  if (isPdConsentCookieValid(consentVersion)) {
    await recordUserPdConsent(storageUser.telegramId, PD_CONSENT_VERSION);
  }
  const alreadyConsented = await userHasPdConsent(storageUser.telegramId);

  const existing = await getStoredUserProfile(storageUser.telegramId);
  if (
    !existing.firstName &&
    !existing.lastName &&
    (user.firstName || user.lastName)
  ) {
    await updateStoredUserProfile(storageUser.telegramId, {
      ...existing,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  const token = signSessionToken({
    telegramId: realTelegramId,
    appEnv: env,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });

  return {
    token,
    user: {
      telegramId: realTelegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      appEnv: env,
    },
    pdConsent: alreadyConsented || isPdConsentCookieValid(consentVersion),
  };
}
