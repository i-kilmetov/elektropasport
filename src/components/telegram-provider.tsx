"use client";

import { useEffect, type ReactNode } from "react";
import { initTelegramMock } from "@/lib/telegram";

/**
 * Boots Telegram Mini App SDK when available.
 * Outside Telegram uses mock env — no Bot API / server calls.
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initTelegramMock();

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
                bg_color: "#0B0B0F",
                text_color: "#FFFFFF",
                hint_color: "#AAAAAA",
                link_color: "#7C5CFF",
                button_color: "#7C5CFF",
                button_text_color: "#FFFFFF",
                secondary_bg_color: "#16161D",
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
      } catch {
        // Local browser preview without Telegram runtime.
      }
    })();
  }, []);

  return <>{children}</>;
}
