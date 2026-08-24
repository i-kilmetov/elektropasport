"use client";

import { useEffect, useState, type ReactNode } from "react";
import { canUseServerAuth } from "@/lib/client-auth";
import { TelegramAuthScreen } from "@/components/screens/telegram-auth-screen";
import { TestLoginForm } from "@/components/screens/test-login-form";

type GateState =
  | { phase: "loading" }
  | { phase: "telegram" }
  | { phase: "password" }
  | { phase: "ready" }
  | { phase: "misconfigured" };

export function DocsAccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!canUseServerAuth()) {
        if (!cancelled) setState({ phase: "telegram" });
        return;
      }

      try {
        const res = await fetch("/api/test-access", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 503) {
          setState({ phase: "misconfigured" });
          return;
        }
        const data = (await res.json()) as { ok?: boolean };
        setState({ phase: data.ok ? "ready" : "password" });
      } catch {
        if (!cancelled) setState({ phase: "password" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f4f4f5]">
        <p className="text-[14px] text-zinc-500">Проверяем доступ…</p>
      </main>
    );
  }

  if (state.phase === "telegram") {
    return (
      <div className="min-h-dvh bg-[#f4f4f5]">
        <TelegramAuthScreen
          minimal
          returnTo="/docs"
        />
      </div>
    );
  }

  if (state.phase === "misconfigured") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f4f4f5] px-6">
        <p className="max-w-sm text-center text-[14px] leading-relaxed text-zinc-600">
          Пароль доступа к документации не настроен на сервере
          (TEST_SITE_PASSWORD).
        </p>
      </main>
    );
  }

  if (state.phase === "password") {
    return (
      <TestLoginForm
        next="/docs"
        title="Документация Током"
        description="Сначала войдите через Telegram, затем введите пароль администратора — тот же, что для test.tokom.ru."
        onSuccess={() => setState({ phase: "ready" })}
      />
    );
  }

  return <>{children}</>;
}
