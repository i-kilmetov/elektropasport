import { resolveAppOrigin } from "@/lib/app-url";

export const SHARE_TOKEN_RE = /^p[A-Za-z0-9]{8,16}$/;

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

function resolveShareOrigin(origin?: string): string {
  if (origin?.trim()) {
    return origin.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return resolveAppOrigin();
}

/** Public website link to open a shared panel (not a Telegram bot deep link). */
export function buildPanelShareUrl(token: string, origin?: string): string {
  const url = new URL("/", resolveShareOrigin(origin));
  url.searchParams.set("share", token);
  return url.href;
}

/** Invite links keep `startapp` for Mini App + legacy compatibility. */
export function buildInviteUrl(token: string, origin?: string): string {
  const url = new URL("/", resolveShareOrigin(origin));
  url.searchParams.set("startapp", token);
  return url.href;
}

const SHARE_TEXT = "Щиток в Токоме";
export const INVITE_SHARE_TEXT = "Приглашаю в Током";

export const MASTER_REFERRAL_PARAM = "master";
export const MASTER_REFERRAL_SHARE_TEXT =
  "Вас посоветовали как электрика для Токома. Откройте заявку и расскажите о себе — рассмотрим сотрудничество.";

export function isMasterReferralParam(
  value: string | null | undefined,
): boolean {
  return value === MASTER_REFERRAL_PARAM;
}

export function buildMasterReferralUrl(origin?: string): string {
  const url = new URL("/", resolveShareOrigin(origin));
  url.searchParams.set("intent", "become-master");
  return url.href;
}

/** Panel share token from URL (web) or Telegram Mini App start param. */
export function getPanelShareTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const fromShare = params.get("share")?.trim();
  if (fromShare && isPanelShareToken(fromShare)) {
    return fromShare;
  }

  const fromStartapp = params.get("startapp")?.trim();
  if (fromStartapp && isPanelShareToken(fromStartapp)) {
    return fromStartapp;
  }

  const fromTelegram = getTelegramStartParam();
  if (fromTelegram && isPanelShareToken(fromTelegram)) {
    return fromTelegram;
  }

  return null;
}

export function stripPanelShareFromLocation(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  let changed = false;

  if (url.searchParams.has("share")) {
    url.searchParams.delete("share");
    changed = true;
  }

  const startapp = url.searchParams.get("startapp")?.trim();
  if (startapp && isPanelShareToken(startapp)) {
    url.searchParams.delete("startapp");
    changed = true;
  }

  if (!changed) return;

  const next =
    url.pathname +
    (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
    url.hash;
  window.history.replaceState({}, "", next);
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
