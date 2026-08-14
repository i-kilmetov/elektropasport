"use client";

import { motion } from "framer-motion";
import { Check, Copy, MoreHorizontal, Send, X } from "lucide-react";
import { useState } from "react";
import { IosShareIcon } from "@/components/icons/ios-share-icon";
import { Portal } from "@/components/ui/portal";
import { hapticNotification } from "@/lib/haptics";
import {
  copyShareLink,
  shareViaNative,
  shareViaTelegram,
} from "@/lib/panel-share";

export function ShareSheet({
  url,
  title = "Поделиться",
  shareText,
  onClose,
}: {
  url: string;
  title?: string;
  shareText?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error(error);
    }
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto w-full max-w-[430px] rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IosShareIcon className="h-5 w-5 text-zinc-700" />
              <h2 className="text-[18px] font-semibold text-zinc-900">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {canNativeShare && (
              <button
                type="button"
                onClick={() =>
                  void run(async () => {
                    await shareViaNative(url, shareText);
                    onClose();
                  })
                }
                className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
                  <MoreHorizontal className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-zinc-900">
                    Другие приложения
                  </span>
                  <span className="mt-0.5 block text-[13px] text-zinc-500">
                    Сообщения, почта, файлы и всё остальное
                  </span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  await shareViaTelegram(url, shareText);
                  onClose();
                })
              }
              className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
                <Send className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-zinc-900">
                  Telegram
                </span>
                <span className="mt-0.5 block text-[13px] text-zinc-500">
                  Отправить ссылку в чат
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  await copyShareLink(url);
                  hapticNotification("success");
                  setCopied(true);
                  window.setTimeout(onClose, 700);
                })
              }
              className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
                {copied ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-zinc-900">
                  {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-zinc-500">
                  {url}
                </span>
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
