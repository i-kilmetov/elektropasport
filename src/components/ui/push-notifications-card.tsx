"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticNotification } from "@/lib/haptics";
import {
  disableWebPush,
  enableWebPush,
  getCurrentPushSubscription,
  readPushUiState,
  sendTestWebPush,
  type PushUiState,
} from "@/lib/web-push-client";

export function PushNotificationsCard() {
  const [state, setState] = useState<PushUiState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);
    try {
      const result = await enableWebPush();
      setState("on");
      setMessage(
        result.tested
          ? "Тестовое уведомление отправлено. Если его не видно, сверните приложение — на iPhone пуш часто не показывается, пока Током открыт."
          : "Уведомления включены. Тест мог не дойти сразу — нажмите «Отправить тест» ещё раз.",
      );
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

  const disable = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
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

  const sendTest = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await sendTestWebPush();
      setMessage(
        "Тест отправлен. Сверните Током — на iPhone уведомление часто видно только когда приложение закрыто.",
      );
      hapticNotification("success");
    } catch (err) {
      hapticNotification("error");
      setError(err instanceof Error ? err.message : "Не удалось отправить тест");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading" || state === "unsupported") {
    return null;
  }

  return (
    <GlassCard className="p-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-zinc-100 text-zinc-700">
          {state === "on" ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-zinc-900">
            Уведомления
          </div>
          {state === "needs-standalone" && (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              На iPhone пуши приходят только если Током открыт иконкой с экрана
              Домой — той, которую вы добавили из Safari.
            </p>
          )}
          {state === "needs-login" && (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Войдите через Telegram, затем включите уведомления.
            </p>
          )}
          {state === "denied" && (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Уведомления запрещены в настройках iPhone. Откройте Настройки →
              Уведомления → Током и разрешите их.
            </p>
          )}
          {(state === "off" || state === "on") && (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Сообщим, когда мастер примет заявку или изменится её статус.
            </p>
          )}
        </div>
      </div>

      {state === "off" && (
        <Button
          className="mt-4 w-full"
          size="sm"
          disabled={busy}
          onClick={() => void enable()}
        >
          {busy ? "Включаем…" : "Включить уведомления"}
        </Button>
      )}
      {state === "on" && (
        <div className="mt-4 space-y-2">
          <Button
            className="w-full"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void sendTest()}
          >
            Отправить тест
          </Button>
          <Button
            className="w-full"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void disable()}
          >
            <BellOff className="h-4 w-4" />
            {busy ? "Выключаем…" : "Выключить на этом устройстве"}
          </Button>
        </div>
      )}
      {state === "needs-standalone" && (
        <p className="mt-3 text-[12px] leading-relaxed text-zinc-400">
          Закройте вкладку Safari и откройте Током с рабочего стола.
        </p>
      )}
      {message && (
        <p className="mt-3 text-[13px] leading-relaxed text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-[13px] leading-relaxed text-rose-600">{error}</p>
      )}
    </GlassCard>
  );
}
