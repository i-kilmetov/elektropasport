"use client";

const SESSION_KEY = "elektropasport:auth-token";
const SESSION_USER_KEY = "elektropasport:auth-user";

export type BrowserAuthUser = {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
};

export function getInitData(): string | null {
  if (typeof window === "undefined") return null;
  const webApp = window.Telegram?.WebApp as { initData?: string } | undefined;
  const initData = webApp?.initData?.trim();
  return initData || null;
}

/** True when opened inside Telegram Mini App with valid initData. */
export function isTelegramMiniApp(): boolean {
  return Boolean(getInitData());
}

export function getBrowserSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function getBrowserAuthUser(): BrowserAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrowserAuthUser;
  } catch {
    return null;
  }
}

export function saveBrowserSession(token: string, user: BrowserAuthUser): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } catch {
    // private mode
  }
}

export function clearBrowserSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // ignore
  }
}

/** Whether API calls can be authenticated (Mini App or browser session). */
export function canUseServerAuth(): boolean {
  return Boolean(getInitData() || getBrowserSessionToken());
}

export function authHeaders(): HeadersInit {
  const initData = getInitData();
  if (initData) {
    return { Authorization: `tma ${initData}` };
  }
  const token = getBrowserSessionToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function getTelegramBotUsername(): string | null {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  return username || null;
}
