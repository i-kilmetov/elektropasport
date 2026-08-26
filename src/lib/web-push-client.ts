"use client";

import { authHeaders, canUseServerAuth, isTelegramMiniApp } from "@/lib/client-auth";

export const PUSH_BANNER_DISMISS_KEY = "elektropasport:push-banner-dismissed";

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

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canUsePushApis()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function vapidPublicKey(): Promise<string> {
  const res = await fetch("/api/push/vapid");
  const data = (await res.json().catch(() => ({}))) as {
    publicKey?: string;
    error?: string;
  };
  if (!res.ok || !data.publicKey) {
    throw new Error(data.error || "Не удалось получить ключ уведомлений");
  }
  return data.publicKey;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!canUsePushApis()) return null;
  const ready = await navigator.serviceWorker.ready;
  return ready.pushManager.getSubscription();
}

export async function syncPushSubscriptionToServer(
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
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

  const registration = await registerPushServiceWorker();
  if (!registration) {
    throw new Error("Не удалось зарегистрировать сервис уведомлений");
  }
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Разрешение на уведомления не выдано");
  }

  const publicKey = await vapidPublicKey();
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  await syncPushSubscriptionToServer(subscription);

  const testRes = await fetch("/api/push/test", {
    method: "POST",
    headers: authHeaders(),
  });
  return { tested: testRes.ok };
}

export async function sendTestWebPush(): Promise<void> {
  const res = await fetch("/api/push/test", {
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
      await fetch("/api/push/subscribe", {
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
