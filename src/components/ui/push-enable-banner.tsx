"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { hapticNotification } from "@/lib/haptics";
import {
  PUSH_BANNER_DISMISS_KEY,
  enableWebPush,
  getCurrentPushSubscription,
  isStandaloneDisplay,
  readPushUiState,
} from "@/lib/web-push-client";

export function PushEnableBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (localStorage.getItem(PUSH_BANNER_DISMISS_KEY) === "1") return;
      } catch {
        // private mode
      }
      if (!isStandaloneDisplay()) return;
      const ui = readPushUiState();
      if (ui !== "off") return;
      try {
        const sub = await getCurrentPushSubscription();
        if (cancelled || sub) return;
        setVisible(true);
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(PUSH_BANNER_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await enableWebPush();
      dismiss();
      hapticNotification("success");
    } catch (err) {
      hapticNotification("error");
      setError(
        err instanceof Error ? err.message : "Не удалось включить уведомления",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-5 mb-3 shrink-0 rounded-[20px] border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_1px_rgba(17,17,19,0.04)] lg:mx-10">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#D3DA00]/35 text-zinc-900">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-zinc-900">
            Включить уведомления
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">
            Напишем, когда мастер примет заявку
          </p>
          {error && (
            <p className="mt-1.5 text-[12px] leading-snug text-rose-600">
              {error}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="rounded-full bg-[#111113] px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Включаем…" : "Включить"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={dismiss}
              className="text-[13px] font-medium text-zinc-500"
            >
              Не сейчас
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
