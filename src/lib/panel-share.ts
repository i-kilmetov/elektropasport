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

const SHARE_TEXT = "Щиток в Щиттоке";
export const INVITE_SHARE_TEXT = "Приглашаю в Щитток";

export const MASTER_REFERRAL_PARAM = "master";
export const MASTER_REFERRAL_SHARE_TEXT =
  "Вас посоветовали как электрика для Щиттока. Откройте заявку и расскажите о себе — рассмотрим сотрудничество.";

export function isMasterReferralParam(
  value: string | null | undefined,
): boolean {
  return value === MASTER_REFERRAL_PARAM;
}

export function buildMasterReferralUrl(): string {
  return buildPanelShareUrl(MASTER_REFERRAL_PARAM);
}

export async function shareViaNative(
  url: string,
  text = SHARE_TEXT,
): Promise<void> {
  if (typeof navigator === "undefined" || !("share" in navigator)) {
    throw new Error("Системное меню недоступно");
  }
  await navigator.share({ title: text, url, text });
}

export async function shareViaTelegram(
  url: string,
  text = SHARE_TEXT,
): Promise<void> {
  const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const webApp = window.Telegram?.WebApp as
    | {
        openTelegramLink?: (link: string) => void;
        openLink?: (link: string) => void;
      }
    | undefined;

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(telegramShare);
    return;
  }
  if (webApp?.openLink) {
    webApp.openLink(telegramShare);
    return;
  }
  window.open(telegramShare, "_blank", "noopener,noreferrer");
}

export async function copyShareLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

export async function sharePanelLink(
  url: string,
): Promise<"telegram" | "native" | "clipboard"> {
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await shareViaNative(url);
      return "native";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "native";
      }
    }
  }

  await copyShareLink(url);
  return "clipboard";
}
