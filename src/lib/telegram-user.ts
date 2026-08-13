import { getBrowserAuthUser } from "@/lib/client-auth";
import { getUserProfile } from "@/lib/user-profile";

export type TelegramProfileInfo = {
  id?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
};

export function getTelegramProfileInfo(): TelegramProfileInfo {
  if (typeof window === "undefined") return {};

  const webAppUser = (
    window.Telegram?.WebApp as
      | {
          initDataUnsafe?: {
            user?: {
              id?: number;
              first_name?: string;
              last_name?: string;
              username?: string;
              photo_url?: string;
              language_code?: string;
            };
          };
        }
      | undefined
  )?.initDataUnsafe?.user;

  if (webAppUser) {
    return {
      id: webAppUser.id,
      firstName: webAppUser.first_name,
      lastName: webAppUser.last_name,
      username: webAppUser.username,
      photoUrl: webAppUser.photo_url,
      languageCode: webAppUser.language_code,
    };
  }

  const browserUser = getBrowserAuthUser();
  if (browserUser) {
    return {
      id: browserUser.telegramId,
      firstName: browserUser.firstName,
      lastName: browserUser.lastName,
      username: browserUser.username,
    };
  }

  return {};
}

export function getTelegramUserName(): string {
  const custom = getUserProfile().displayName?.trim();
  if (custom) return custom;

  const info = getTelegramProfileInfo();
  const full = [info.firstName, info.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (info.username) return info.username;
  return "Пользователь Telegram";
}
