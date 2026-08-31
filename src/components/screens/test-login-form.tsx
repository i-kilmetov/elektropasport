"use client";

import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  buildPostTestLoginUrl,
  markSplashSeen,
} from "@/lib/splash-session";

export function TestLoginForm({
  next = "/",
  onSuccess,
  title = "Тестовая среда",
  description = "test.tokom.ru — здесь проверяются новые функции до релиза на основной сайт.",
}: {
  next?: string;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finishTestLogin = () => {
    markSplashSeen();
    if (onSuccess) {
      onSuccess();
      return;
    }
    window.location.replace(buildPostTestLoginUrl(next));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/test-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Неверный пароль");
        return;
      }
      if (onSuccess) {
        finishTestLogin();
        return;
      }
      finishTestLogin();
    } catch {
      setError("Не удалось проверить пароль. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLogo className="h-10" />
        </div>
        <div className="rounded-[28px] border border-black/8 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-center ty-title">
            {title}
          </h1>
          <p className="mb-6 text-center ty-body">
            {description}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block ty-label text-zinc-700">
                Пароль администратора
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-[16px] border border-black/10 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:bg-white"
                placeholder="Введите пароль"
                required
              />
            </label>
            {error && (
              <p className="rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 ty-note text-rose-700">
                {error}
              </p>
            )}
            <Button type="submit" className="h-12 w-full" disabled={loading}>
              {loading ? "Проверяем…" : "Войти"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
