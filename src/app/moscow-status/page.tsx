"use client";

import { useEffect, useState } from "react";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";

type StatusPayload = {
  configured?: boolean;
  apiProbe?: { ok: boolean; status: number; error?: string };
  sampleLookup?: {
    status: string;
    datasetId?: number | null;
    detail?: string;
  };
  samplePassport?: {
    address: string | null;
    buildingYear: number | null;
    operationYear: number | null;
  } | null;
  hint?: string;
  error?: string;
};

export default function MoscowStatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!canUseServerAuth()) {
        if (!cancelled) {
          setData({
            error:
              "Нет авторизованной сессии в этом браузере. Откройте tokom.ru и войдите через Telegram, затем обновите эту страницу.",
          });
          setLoading(false);
        }
        return;
      }

      try {
        const query = new URLSearchParams({
          address: "Осташковский пр-д, д 4",
          street: "Осташковский проезд",
          house: "4",
        });
        const res = await fetch(`/api/moscow-open-data/status?${query}`, {
          headers: authHeaders(),
          cache: "no-store",
        });
        const json = (await res.json()) as StatusPayload;
        if (!cancelled) setData(json);
      } catch (error) {
        if (!cancelled) {
          setData({
            error:
              error instanceof Error
                ? error.message
                : "Не удалось запросить статус",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto min-h-[100dvh] max-w-xl bg-white px-5 py-8 text-zinc-900">
      <h1 className="text-[22px] font-semibold">Проверка data.mos.ru</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
        Страница читает ключ с сервера через вашу сессию Током (localStorage),
        поэтому прямой заход на{" "}
        <code className="text-[12px]">/api/moscow-open-data/status</code> без
        заголовка Authorization не подходит.
      </p>

      {loading ? (
        <p className="mt-6 text-[15px] text-zinc-500">Проверяем…</p>
      ) : (
        <pre className="mt-6 overflow-x-auto rounded-[16px] border border-black/8 bg-zinc-50 p-4 text-[12px] leading-relaxed whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
