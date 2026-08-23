"use client";

/** Set PD consent cookie, then open Telegram OAuth. */
export async function beginTelegramLogin(): Promise<void> {
  const res = await fetch("/api/auth/consent", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Не удалось сохранить согласие");
  }
  window.location.assign("/api/auth/telegram/start");
}

export async function acceptPdConsentForSession(): Promise<void> {
  const res = await fetch("/api/auth/consent", {
    method: "POST",
    credentials: "include",
    headers: authHeadersForConsent(),
  });
  if (!res.ok) {
    throw new Error("Не удалось сохранить согласие");
  }
}

export async function fetchPdConsentStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/consent", {
      credentials: "include",
      headers: authHeadersForConsent(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accepted?: boolean };
    return Boolean(data.accepted);
  } catch {
    return false;
  }
}

function authHeadersForConsent(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = localStorage.getItem("elektropasport:auth-token")?.trim();
    if (token) return { Authorization: `Bearer ${token}` };
    const webApp = window.Telegram?.WebApp as { initData?: string } | undefined;
    const initData = webApp?.initData?.trim();
    if (initData) return { Authorization: `tma ${initData}` };
  } catch {
    // ignore
  }
  return {};
}
