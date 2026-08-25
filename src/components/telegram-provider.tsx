"use client";

import { useEffect, type ReactNode } from "react";
import { initTelegramMock } from "@/lib/telegram";
import { lockPortraitOrientation } from "@/lib/portrait-lock";

/**
 * Boots Telegram Mini App SDK when available.
 * Outside Telegram uses mock env — no Bot API / server calls.
 */
function bindAppHeight() {
  const root = document.documentElement;

  const apply = (height?: number) => {
    if (typeof height === "number" && height > 0) {
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
    }
  };

  const webApp = window.Telegram?.WebApp as
    | {
        viewportStableHeight?: number;
        onEvent?: (event: string, cb: () => void) => void;
        offEvent?: (event: string, cb: () => void) => void;
      }
    | undefined;

  const syncTelegram = () => apply(webApp?.viewportStableHeight);
  const syncFallback = () => {
    if (webApp?.viewportStableHeight) {
      syncTelegram();
      return;
    }
    apply(window.visualViewport?.height ?? window.innerHeight);
  };

  syncFallback();
  webApp?.onEvent?.("viewportChanged", syncTelegram);
  window.visualViewport?.addEventListener("resize", syncFallback);
  window.addEventListener("resize", syncFallback);

  return () => {
    webApp?.offEvent?.("viewportChanged", syncTelegram);
    window.visualViewport?.removeEventListener("resize", syncFallback);
    window.removeEventListener("resize", syncFallback);
  };
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initTelegramMock();
    let unbindHeight = bindAppHeight();
    const unlockPortrait = lockPortraitOrientation();

    void (async () => {
      try {
        const { isTMA, mockTelegramEnv, init, miniApp, viewport } = await import(
          "@tma.js/sdk"
        );

        const inside = await isTMA();
        if (!inside) {
          mockTelegramEnv({
            launchParams: {
              tgWebAppPlatform: "web",
              tgWebAppVersion: "8.0",
              tgWebAppThemeParams: {
                bg_color: "#FFFFFF",
                text_color: "#111113",
                hint_color: "#71717A",
                link_color: "#7C5CFF",
                button_color: "#111113",
                button_text_color: "#FFFFFF",
                secondary_bg_color: "#F4F4F5",
              },
            },
          });
        }

        init();
        if (miniApp.ready.isAvailable()) {
          miniApp.ready();
        }
        if (viewport.expand.isAvailable()) {
          viewport.expand();
        }
        unbindHeight();
        unbindHeight = bindAppHeight();
      } catch {
        // Local browser preview without Telegram runtime.
      }
    })();

    return () => {
      unbindHeight();
      unlockPortrait();
    };
  }, []);

  return <>{children}</>;
}
