import { getBrowserAuthUser } from "@/lib/client-auth";

export function getTelegramUserName(): string {
  if (typeof window === "undefined") return "";

  const webAppUser = (
    window.Telegram?.WebApp as
      | {
          initDataUnsafe?: {
            user?: {
              first_name?: string;
              last_name?: string;
              username?: string;
            };
          };
        }
      | undefined
  )?.initDataUnsafe?.user;

  if (webAppUser) {
    const full = [webAppUser.first_name, webAppUser.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (full) return full;
    if (webAppUser.username) return webAppUser.username;
  }

  const browserUser = getBrowserAuthUser();
  if (browserUser) {
    const full = [browserUser.firstName, browserUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (full) return full;
    if (browserUser.username) return browserUser.username;
  }

  return "Пользователь Telegram";
}
