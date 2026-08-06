"use client";

/**
 * Lightweight Telegram Mini App bootstrap.
 * Uses @tma.js/sdk when available inside Telegram; otherwise runs as a local mock.
 * No Telegram Bot API / backend calls.
 */

type TelegramMock = {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  platform: string;
  colorScheme: "dark" | "light";
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramMock & Record<string, unknown>;
    };
  }
}

export function initTelegramMock(): TelegramMock {
  if (typeof window === "undefined") {
    return {
      ready: () => undefined,
      expand: () => undefined,
      setHeaderColor: () => undefined,
      setBackgroundColor: () => undefined,
      platform: "unknown",
      colorScheme: "dark",
    };
  }

  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.ready();
    webApp.expand?.();
    webApp.setHeaderColor?.("#0B0B0F");
    webApp.setBackgroundColor?.("#0B0B0F");
    return webApp as TelegramMock;
  }

  const mock: TelegramMock = {
    ready: () => undefined,
    expand: () => undefined,
    setHeaderColor: () => undefined,
    setBackgroundColor: () => undefined,
    platform: "web-mock",
    colorScheme: "dark",
  };

  window.Telegram = { WebApp: mock };
  return mock;
}
