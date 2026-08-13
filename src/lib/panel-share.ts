export const SHARE_TOKEN_RE = /^p[A-Za-z0-9]{8,16}$/;

function botUsername(): string | null {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || null;
}

export function isPanelShareToken(value: string): boolean {
  return SHARE_TOKEN_RE.test(value);
}

export function getTelegramStartParam(): string | null {
  if (typeof window === "undefined") return null;

  const fromWebApp = (
    window.Telegram?.WebApp as
      | { initDataUnsafe?: { start_param?: string } }
      | undefined
  )?.initDataUnsafe?.start_param?.trim();
  if (fromWebApp) return fromWebApp;

  try {
    const hash = window.location.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    const fromHash = hashParams.get("tgWebAppStartParam")?.trim();
    if (fromHash) return fromHash;
  } catch {
    // ignore
  }

  const fromQuery = new URLSearchParams(window.location.search)
    .get("startapp")
    ?.trim();
  return fromQuery || null;
}

export function buildPanelShareUrl(token: string): string {
  const bot = botUsername();
  const app = process.env.NEXT_PUBLIC_TELEGRAM_MINI_APP_NAME?.trim();
  if (!bot) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/?startapp=${encodeURIComponent(token)}`;
  }
  if (app) {
    return `https://t.me/${bot}/${app}?startapp=${encodeURIComponent(token)}`;
  }
  return `https://t.me/${bot}?startapp=${encodeURIComponent(token)}`;
}

export async function sharePanelLink(url: string): Promise<"telegram" | "native" | "clipboard"> {
  const text = "Щиток в Электропаспорте";
  const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const webApp = window.Telegram?.WebApp as
    | { openTelegramLink?: (link: string) => void }
    | undefined;

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(telegramShare);
    return "telegram";
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: text, url, text });
      return "native";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "native";
      }
    }
  }

  await navigator.clipboard.writeText(url);
  return "clipboard";
}
