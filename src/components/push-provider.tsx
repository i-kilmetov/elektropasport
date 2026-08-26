"use client";

import { useEffect, type ReactNode } from "react";
import { canUseServerAuth, isTelegramMiniApp } from "@/lib/client-auth";
import {
  canUsePushApis,
  getCurrentPushSubscription,
  hasNotificationPermission,
  preloadPushResources,
  syncPushSubscriptionToServer,
} from "@/lib/web-push-client";

/**
 * Registers the push service worker and re-saves an existing subscription
 * so iOS Home Screen apps keep working after a reinstall/update.
 */
export function PushProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (isTelegramMiniApp()) return;
    if (!canUsePushApis()) return;

    let cancelled = false;
    void (async () => {
      try {
        await preloadPushResources();
        if (cancelled) return;
        if (!canUseServerAuth()) return;
        if (!hasNotificationPermission()) return;
        const subscription = await getCurrentPushSubscription();
        if (!subscription || cancelled) return;
        await syncPushSubscriptionToServer(subscription);
      } catch {
        // Permission or SW registration can fail silently on unsupported Safari tabs.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
