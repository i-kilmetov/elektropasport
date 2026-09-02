"use client";

import { POST_AUTH_NEXT_KEY, safeAuthNextPath } from "@/lib/auth-flow";
import { isTelegramMiniApp } from "@/lib/client-auth";
import { PD_CONSENT_VERSION } from "@/lib/pd-consent";

const LOCAL_CONSENT_KEY = "elektropasport:pd-consent";

function readLocalPdConsent(): boolean {
  try {
    return Boolean(localStorage.getItem(LOCAL_CONSENT_KEY)?.trim());
  } catch {
    return false;
  }
}

function writeLocalPdConsent(version: string = PD_CONSENT_VERSION): void {
  try {
    localStorage.setItem(LOCAL_CONSENT_KEY, version);
  } catch {
    // private mode
  }
}

/** Open Telegram OAuth. PD / cookie consent is collected after login. */
export async function beginTelegramLogin(next?: string): Promise<void> {
  try {
    const path = safeAuthNextPath(next);
    if (path === "/") {
      sessionStorage.removeItem(POST_AUTH_NEXT_KEY);
    } else {
      sessionStorage.setItem(POST_AUTH_NEXT_KEY, path);
    }
  } catch {
    // ignore
  }

  const startUrl = new URL(
    "/api/auth/telegram/start",
    window.location.origin,
  ).href;

  const webApp = window.Telegram?.WebApp as
    | { openLink?: (url: string) => void; platform?: string }
    | undefined;

  // Inside Telegram — open OAuth in the system browser so the user lands back on the site.
  if (
    webApp?.openLink &&
    (isTelegramMiniApp() ||
      (webApp.platform && webApp.platform !== "unknown"))
  ) {
    webApp.openLink(startUrl);
    return;
  }

  window.location.assign(startUrl);
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
  writeLocalPdConsent();
}

export async function fetchPdConsentStatus(): Promise<boolean> {
  const localAccepted = readLocalPdConsent();
  try {
    const res = await fetch("/api/auth/consent", {
      credentials: "include",
      headers: authHeadersForConsent(),
    });
    if (!res.ok) return localAccepted;
    const data = (await res.json()) as { accepted?: boolean };
    if (data.accepted) {
      writeLocalPdConsent();
      return true;
    }
    if (localAccepted) {
      // Local gate was accepted earlier — push it to the server/user row.
      try {
        await acceptPdConsentForSession();
        return true;
      } catch {
        return true;
      }
    }
    return false;
  } catch {
    return localAccepted;
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
