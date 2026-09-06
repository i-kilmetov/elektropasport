"use client";

import {
  POST_AUTH_NEXT_KEY,
  safeAuthNextPath,
} from "@/lib/auth-flow";
import {
  isTelegramMiniApp,
  type BrowserAuthUser,
} from "@/lib/client-auth";
import { completeBrowserLogin } from "@/lib/phone-auth-client";
import { PD_CONSENT_VERSION } from "@/lib/pd-consent";

const LOCAL_CONSENT_KEY = "elektropasport:pd-consent";
const SCRIPT_SRC = "https://oauth.telegram.org/js/telegram-login.js";

type TelegramLoginResult = {
  id_token?: string;
  error?: string;
  user?: Record<string, unknown>;
};

type TelegramLoginApi = {
  auth: (
    options: {
      client_id: number | string;
      scope?: Array<"profile" | "phone" | "write">;
      lang?: string;
      nonce?: string;
    },
    callback: (data: TelegramLoginResult) => void,
  ) => void;
};

type TelegramGlobals = {
  Login?: TelegramLoginApi;
  WebApp?: {
    openLink?: (url: string) => void;
    platform?: string;
    initData?: string;
  };
};

function telegramGlobals(): TelegramGlobals {
  return ((window as unknown as { Telegram?: TelegramGlobals }).Telegram ??
    {}) as TelegramGlobals;
}

let scriptPromise: Promise<TelegramLoginApi> | null = null;
let cachedClientId: string | null = null;

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

async function fetchClientId(): Promise<string> {
  if (cachedClientId) return cachedClientId;
  const res = await fetch("/api/auth/telegram/config", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Telegram Login не настроен");
  }
  const data = (await res.json()) as { clientId?: string };
  const id = data.clientId?.trim() ?? "";
  if (!id) throw new Error("Telegram Login не настроен");
  cachedClientId = id;
  return id;
}

function loadTelegramLoginScript(): Promise<TelegramLoginApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Только в браузере"));
  }
  const existing = telegramGlobals().Login;
  if (existing?.auth) return Promise.resolve(existing);

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TelegramLoginApi>((resolve, reject) => {
    const done = () => {
      const api = telegramGlobals().Login;
      if (api?.auth) {
        resolve(api);
        return;
      }
      reject(new Error("Не удалось загрузить Telegram Login"));
    };

    const prior = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (prior) {
      if (telegramGlobals().Login?.auth) {
        done();
        return;
      }
      prior.addEventListener("load", done, { once: true });
      prior.addEventListener(
        "error",
        () => reject(new Error("Не удалось загрузить Telegram Login")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = done;
    script.onerror = () =>
      reject(new Error("Не удалось загрузить Telegram Login"));
    document.head.appendChild(script);
  }).finally(() => {
    if (!telegramGlobals().Login?.auth) scriptPromise = null;
  });

  return scriptPromise;
}

function rememberNextPath(next?: string): void {
  try {
    const path = safeAuthNextPath(next);
    if (path === "/") {
      sessionStorage.removeItem(POST_AUTH_NEXT_KEY);
    } else {
      sessionStorage.setItem(POST_AUTH_NEXT_KEY, path);
    }
  } catch {
    // private mode
  }
}

async function exchangeIdToken(idToken: string): Promise<{
  token: string;
  user: BrowserAuthUser;
}> {
  const res = await fetch("/api/auth/telegram/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    token?: string;
    user?: BrowserAuthUser;
  };
  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.error || "Не удалось завершить вход");
  }
  return { token: data.token, user: data.user };
}

/**
 * Popup OIDC via Telegram's official login library.
 * The popup exchanges the code on oauth.telegram.org and returns id_token
 * via postMessage — our server never needs to reach Telegram's token endpoint.
 */
export async function beginTelegramLogin(next?: string): Promise<void> {
  rememberNextPath(next);

  const webApp = telegramGlobals().WebApp;
  // Mini App: open the same-origin site in the system browser so the popup
  // library can run outside Telegram's restricted WebView.
  if (
    webApp?.openLink &&
    (isTelegramMiniApp() ||
      (webApp.platform && webApp.platform !== "unknown"))
  ) {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("auth", "telegram");
    webApp.openLink(url.href);
    return;
  }

  const [clientId, login] = await Promise.all([
    fetchClientId(),
    loadTelegramLoginScript(),
  ]);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };

    try {
      login.auth(
        {
          client_id: clientId,
          scope: ["profile", "write"],
          lang: "ru",
        },
        (data) => {
          void (async () => {
            try {
              if (!data || data.error) {
                finish(
                  new Error(
                    data?.error === "cancelled"
                      ? "Вход отменён"
                      : data?.error || "Не удалось войти через Telegram",
                  ),
                );
                return;
              }
              if (!data.id_token) {
                finish(new Error("Telegram не вернул id_token"));
                return;
              }
              const session = await exchangeIdToken(data.id_token);
              completeBrowserLogin(session.token, session.user, next);
              finish();
            } catch (error) {
              finish(
                error instanceof Error
                  ? error
                  : new Error("Не удалось завершить вход"),
              );
            }
          })();
        },
      );
    } catch (error) {
      finish(
        error instanceof Error
          ? error
          : new Error("Не удалось открыть вход Telegram"),
      );
    }
  });
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
    const initData = telegramGlobals().WebApp?.initData?.trim();
    if (initData) return { Authorization: `tma ${initData}` };
  } catch {
    // ignore
  }
  return {};
}
