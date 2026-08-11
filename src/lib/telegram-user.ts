export function getTelegramUserName(): string {
  if (typeof window === "undefined") return "";

  const user = (
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

  if (!user) return "Пользователь Telegram";

  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username) return user.username;
  return "Пользователь Telegram";
}
