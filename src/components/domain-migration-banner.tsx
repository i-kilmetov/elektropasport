"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { canUseServerAuth } from "@/lib/client-auth";
import { PRODUCTION_APP_URL } from "@/lib/app-url";
import {
  exportHomeBackup,
  syncLocalPanelsToServer,
  type HomeBackupPayload,
} from "@/lib/user-data";
import type { HomeListItem } from "@/types";

export function DomainMigrationBanner({
  localPanelCount,
  onSynced,
}: {
  localPanelCount: number;
  onSynced: (items: HomeListItem[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const downloadBackup = () => {
    const backup = exportHomeBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tokom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncAndOpenTokom = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (canUseServerAuth()) {
        const { uploaded, items } = await syncLocalPanelsToServer();
        onSynced(items);
        setMessage(
          uploaded > 0
            ? `На сервер отправлено щитков: ${uploaded}. Открываем tokom.ru…`
            : "Локальных щитков для отправки не осталось. Открываем tokom.ru…",
        );
      } else {
        downloadBackup();
        setMessage(
          "Скачан файл резервной копии. Войдите в Telegram на tokom.ru и импортируйте его в профиле.",
        );
        setBusy(false);
        return;
      }
      window.setTimeout(() => {
        window.location.assign(PRODUCTION_APP_URL);
      }, 900);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось синхронизировать",
      );
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-black/8 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="mx-auto max-w-[430px]">
        <p className="text-[15px] font-semibold text-zinc-900">
          Сайт переехал на tokom.ru
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
          {localPanelCount > 0
            ? `На этом адресе ещё видно локальных щитков: ${localPanelCount}. Сначала сохраним их на сервер, потом откроем новый домен.`
            : "Локальных щитков здесь нет. Если они были раньше — скачайте резервную копию (если есть) или откройте tokom.ru после входа тем же Telegram."}
        </p>
        {message && (
          <p className="mt-2 text-[13px] text-zinc-700">{message}</p>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => void syncAndOpenTokom()}
          >
            {busy ? "Синхронизация…" : "Сохранить и открыть tokom.ru"}
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            disabled={busy}
            onClick={downloadBackup}
          >
            Скачать копию
          </Button>
        </div>
      </div>
    </div>
  );
}

export function parseHomeBackupFile(file: File): Promise<HomeBackupPayload> {
  return file.text().then((text) => {
    const data = JSON.parse(text) as HomeBackupPayload;
    if (!data || data.version !== 1 || !Array.isArray(data.items)) {
      throw new Error("Некорректный файл резервной копии");
    }
    return data;
  });
}
