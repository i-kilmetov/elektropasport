"use client";

import { useEffect, useRef } from "react";
import { isTestAppHost } from "@/lib/app-env";
import { TEST_SITE_INACTIVITY_MS } from "@/lib/test-site-auth";

/** Log out of the test-site password gate after client idle time. */
export function useTestSiteInactivityLogout() {
  const timerRef = useRef<number | null>(null);
  const lastPingRef = useRef(0);

  useEffect(() => {
    if (!isTestAppHost(window.location.hostname)) return;

    const logout = () => {
      void fetch("/api/test-access", { method: "DELETE" }).finally(() => {
        const next = `${window.location.pathname}${window.location.search}`;
        const login = new URL("/test-login", window.location.origin);
        if (next && next !== "/") {
          login.searchParams.set("next", next);
        }
        login.searchParams.set("reason", "idle");
        window.location.replace(login.toString());
      });
    };

    const pingActivity = () => {
      const now = Date.now();
      if (now - lastPingRef.current < 5 * 60 * 1000) return;
      lastPingRef.current = now;
      void fetch("/api/test-access", { credentials: "include", cache: "no-store" });
    };

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(logout, TEST_SITE_INACTIVITY_MS);
      pingActivity();
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true });
    }
    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      for (const event of events) {
        window.removeEventListener(event, reset);
      }
    };
  }, []);
}
