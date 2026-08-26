"use client";

import { authHeaders, canUseServerAuth, isTelegramMiniApp } from "@/lib/client-auth";

export const PUSH_BANNER_DISMISS_KEY = "elektropasport:push-banner-dismissed";
const VAPID_CACHE_KEY = "elektropasport:vapid-public";

export type PushUiState =
  | "loading"
  | "unsupported"
  | "needs-standalone"
  | "needs-login"
  | "denied"
  | "off"
  | "on";

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return (
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1
  );
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean(
    (window.navigator as { standalone?: boolean }).standalone,
  );
  return media || iosStandalone;
}

export function canUsePushApis(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function hasNotificationPermission(): boolean {
  return (
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
}

export function friendlyPushError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/load failed|failed to fetch|networkerror|fetch/i.test(message)) {
    return "iPhone оборвал запрос после окна разрешения. Нажмите кнопку ещё раз — в Настройках уведомления уже включены.";
  }
  return message || "Не удалось включить уведомления";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /load failed|failed to fetch|networkerror|abort/i.test(error.message);
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  attempts = 4,
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(input, {
        cache: "no-store",
        keepalive: i > 0,
        ...init,
      });
      return res;
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || i === attempts - 1) {
        throw error;
      }
      await delay(400 * (i + 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Не удалось связаться с сервером");
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function readCachedVapidKey(): string | null {
  try {
    return sessionStorage.getItem(VAPID_CACHE_KEY);
  } catch {
    return null;
  }
}

function writeCachedVapidKey(key: string): void {
  try {
    sessionStorage.setItem(VAPID_CACHE_KEY, key);
  } catch {
    // private mode
  }
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canUsePushApis()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function waitForPushRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  const registration =
    existing ?? (await registerPushServiceWorker());
  if (!registration) {
    throw new Error("Не удалось зарегистрировать сервис уведомлений");
  }
  if (registration.active) return registration;

  await Promise.race([
    navigator.serviceWorker.ready,
    delay(8000),
  ]);
  const latest =
    (await navigator.serviceWorker.getRegistration("/")) ?? registration;
  if (!latest.active && !latest.installing && !latest.waiting) {
    throw new Error(
      "Сервис уведомлений не запустился. Полностью закройте Током и откройте снова.",
    );
  }
  return latest;
}

async function vapidPublicKey(): Promise<string> {
  const cached = readCachedVapidKey();
  if (cached) return cached;

  const res = await fetchWithRetry("/api/push/vapid", { method: "GET" });
  const data = (await res.json().catch(() => ({}))) as {
    publicKey?: string;
    error?: string;
  };
  if (!res.ok || !data.publicKey) {
    throw new Error(data.error || "Не удалось получить ключ уведомлений");
  }
  writeCachedVapidKey(data.publicKey);
  return data.publicKey;
}

/** Prefetch SW + VAPID before the iOS permission dialog steals the network. */
export async function preloadPushResources(): Promise<void> {
  if (!canUsePushApis() || isTelegramMiniApp()) return;
  try {
    await registerPushServiceWorker();
  } catch {
    // ignore
  }
  try {
    await vapidPublicKey();
  } catch {
    // First tap will retry.
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!canUsePushApis()) return null;
  const registration = await waitForPushRegistration();
  const manager =
    registration.pushManager ??
    (await navigator.serviceWorker.ready).pushManager;
  return manager.getSubscription();
}

export async function syncPushSubscriptionToServer(
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetchWithRetry("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Не удалось сохранить подписку");
  }
}

async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  publicKey: string,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  let lastError: unknown;
  for (let i = 0; i < 3; i += 1) {
    try {
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    } catch (error) {
      lastError = error;
      if (i === 2) break;
      await delay(500 * (i + 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Не удалось подписаться на уведомления Apple");
}

export async function enableWebPush(): Promise<{ tested: boolean }> {
  if (isTelegramMiniApp()) {
    throw new Error(
      "Системные пуши работают в приложении с экрана Домой, не внутри Telegram",
    );
  }
  if (!canUsePushApis()) {
    throw new Error("Этот браузер не поддерживает уведомления");
  }
  if (isIosDevice() && !isStandaloneDisplay()) {
    throw new Error(
      "На iPhone откройте Током иконкой с экрана Домой — из Safari пуши не приходят",
    );
  }
  if (!canUseServerAuth()) {
    throw new Error("Сначала войдите через Telegram");
  }

  // Network first: iOS often kills fetch after the permission sheet.
  const publicKey = await vapidPublicKey();
  const registration = await waitForPushRegistration();

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Разрешение на уведомления не выдано");
    }
    // Let WebKit recover after the system dialog.
    await delay(500);
  }

  const subscription = await subscribeToPush(registration, publicKey);
  await syncPushSubscriptionToServer(subscription);

  try {
    const testRes = await fetchWithRetry(
      "/api/push/test",
      { method: "POST", headers: authHeaders() },
      3,
    );
    return { tested: testRes.ok };
  } catch {
    return { tested: false };
  }
}

export async function sendTestWebPush(): Promise<void> {
  const res = await fetchWithRetry("/api/push/test", {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Не удалось отправить тест");
  }
}

export async function disableWebPush(): Promise<void> {
  const subscription = await getCurrentPushSubscription();
  if (subscription) {
    try {
      await fetchWithRetry("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } finally {
      await subscription.unsubscribe();
    }
  }
}

export function readPushUiState(): PushUiState {
  if (!canUsePushApis()) return "unsupported";
  if (isTelegramMiniApp()) return "unsupported";
  if (isIosDevice() && !isStandaloneDisplay()) return "needs-standalone";
  if (!canUseServerAuth()) return "needs-login";
  if (Notification.permission === "denied") return "denied";
  return "off";
}
