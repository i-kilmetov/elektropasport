"use client";

import { useEffect, useState } from "react";
import {
  POST_AUTH_NEXT_KEY,
  POST_AUTH_SKIP_SPLASH_KEY,
  safeAuthNextPath,
} from "@/lib/auth-flow";

/**
 * Cross-host OAuth handoff: callback runs on tokom.ru, then lands here on
 * test.tokom.ru (token in location.hash so it never hits the server).
 */
export default function TelegramAuthFinishPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(raw);
      const token = params.get("token")?.trim();
      const user = params.get("user")?.trim();
      if (!token || !user) {
        setError("Сессия входа не найдена. Попробуйте войти ещё раз.");
        return;
      }
      JSON.parse(user);
      localStorage.setItem("elektropasport:auth-token", token);
      localStorage.setItem("elektropasport:auth-user", user);
      sessionStorage.setItem(POST_AUTH_SKIP_SPLASH_KEY, "1");
      let next = "/";
      const stored = sessionStorage.getItem(POST_AUTH_NEXT_KEY);
      if (stored) next = safeAuthNextPath(stored);
      sessionStorage.removeItem(POST_AUTH_NEXT_KEY);
      window.location.replace(next);
    } catch {
      setError("Не удалось завершить вход. Попробуйте ещё раз.");
    }
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-6">
      <p className="ty-body text-zinc-600">
        {error ?? "Завершаем вход…"}
      </p>
    </main>
  );
}
