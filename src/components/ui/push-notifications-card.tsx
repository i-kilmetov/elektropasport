"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticNotification, hapticSelection } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import {
  disableWebPush,
  enableWebPush,
  friendlyPushError,
  getCurrentPushSubscription,
  readPushUiState,
  type PushUiState,
} from "@/lib/web-push-client";

export function PushNotificationsCard() {
  const [state, setState] = useState<PushUiState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = readPushUiState();
      if (next !== "off") {
        if (!cancelled) setState(next);
        return;
      }
      try {
        const sub = await getCurrentPushSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await enableWebPush();
      setState("on");
      hapticNotification("success");
    } catch (err) {
      hapticNotification("error");
      setError(friendlyPushError(err));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await disableWebPush();
      setState("off");
      hapticNotification("success");
    } catch (err) {
      hapticNotification("error");
      setError(
        err instanceof Error ? err.message : "Не удалось выключить уведомления",
      );
    } finally {
      setBusy(false);
    }
  };

  if (state === "unsupported") {
    return null;
  }

  const on = state === "on";
  const canToggle = state === "on" || state === "off" || state === "loading";
  const toggleDisabled = busy || state === "loading" || !canToggle;

  const note =
    state === "needs-standalone"
      ? "На iPhone пуши приходят только если Током открыт иконкой с экрана Домой."
      : state === "needs-login"
        ? "Войдите через Telegram, затем включите уведомления."
        : state === "denied"
          ? "Уведомления запрещены в настройках iPhone. Откройте Настройки → Уведомления → Током."
          : "Сообщим, когда мастер примет заявку или изменится её статус.";

  const toggle = () => {
    if (toggleDisabled) return;
    hapticSelection();
    if (on) void disable();
    else void enable();
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="ty-heading">Уведомления</div>
          <p className="mt-1 ty-note">{note}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={on ? "Выключить уведомления" : "Включить уведомления"}
          disabled={toggleDisabled}
          onClick={toggle}
          className={cn(
            "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-45",
            on ? "bg-[#34C759]" : "bg-zinc-300",
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] left-[2px] block h-[27px] w-[27px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.28),0_3px_8px_rgba(0,0,0,0.12)] transition-transform duration-200",
              on && "translate-x-[20px]",
            )}
          />
        </button>
      </div>
      {error && (
        <p className="mt-3 text-[13px] leading-relaxed text-rose-600">{error}</p>
      )}
    </GlassCard>
  );
}
