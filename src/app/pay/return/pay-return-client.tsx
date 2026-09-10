"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  readRobokassaReturnParams,
  syncRobokassaReturnIfPresent,
} from "@/lib/robokassa-return";

function homePathForKind(kind: string | null): string {
  if (kind === "school") return "/school";
  return "/";
}

export function PayReturnClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Подтверждаем оплату…");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = readRobokassaReturnParams();
      const kind =
        params?.shp.Shp_kind?.trim() ||
        params?.shp.kind?.trim() ||
        null;
      const target = homePathForKind(kind);

      if (!params) {
        if (!cancelled) router.replace(target);
        return;
      }

      const result = await syncRobokassaReturnIfPresent();
      if (cancelled) return;

      if (result?.ok) {
        setMessage("Оплата подтверждена. Возвращаем…");
      } else if (result && !result.ok) {
        setMessage("Не удалось подтвердить оплату автоматически. Возвращаем…");
      }

      // Prefer kind from sync payload when available.
      const next =
        result?.serviceType?.startsWith("school") || kind === "school"
          ? "/school"
          : "/";
      window.setTimeout(() => {
        if (!cancelled) router.replace(next);
      }, 400);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-[var(--app-height,100dvh)] w-full items-center justify-center bg-[var(--bg)] px-6 text-center text-zinc-800">
      <p className="text-sm font-medium tracking-tight">{message}</p>
    </main>
  );
}
