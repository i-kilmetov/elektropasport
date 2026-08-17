"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { ShareSheet } from "@/components/ui/share-sheet";
import { INVITE_SHARE_TEXT } from "@/lib/panel-share";
import { BASE_PANEL_LIMIT, panelWord, type PanelQuota } from "@/lib/invites";
import { cn } from "@/lib/utils";

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function PanelLimitSheet({
  quota,
  onClose,
}: {
  quota: PanelQuota;
  onClose: () => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const canInvite = Boolean(quota.inviteUrl);

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto max-h-[min(88dvh,720px)] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold text-zinc-900">
                Пригласите человека
              </h2>
              <p className="mt-1 text-[13px] text-zinc-500">
                {quota.panelCount} из {BASE_PANEL_LIMIT}{" "}
                {panelWord(BASE_PANEL_LIMIT)} без приглашения
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[15px] leading-relaxed text-zinc-600">
            Один щиток можно добавить сразу. Чтобы хранить сколько угодно,
            пригласите хотя бы одного человека — лимит снимется полностью.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
            Сервис полезен каждому: по фото понятно, что в щитке и как он
            работает. Приглашая людей, вы в первую очередь помогаете им.
          </p>

          {canInvite && (
            <Button className="mt-5 w-full" onClick={() => setShareOpen(true)}>
              <UserPlus className="h-5 w-5" />
              Пригласить пользователя
            </Button>
          )}

          <div className="mt-6">
            <h3 className="mb-2 text-[14px] font-medium text-zinc-600">
              Приглашения
            </h3>
            {quota.events.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Пока никто не открыл вашу ссылку. Когда человек зайдёт в
                приложение, лимит щитков снимется.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-[20px] border border-black/8 bg-zinc-50">
                {quota.events.map((event, index) => (
                  <li key={`${event.createdAt}-${index}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-zinc-900">
                          {event.name}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-[13px] leading-relaxed",
                            event.outcome === "credited"
                              ? "text-emerald-700"
                              : "text-zinc-500",
                          )}
                        >
                          {event.outcome === "credited"
                            ? "Засчитано, лимит щитков снят"
                            : "Уже пользуется сервисом, лимит не снят"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] text-zinc-400">
                        {formatEventDate(event.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {shareOpen && (
          <ShareSheet
            url={quota.inviteUrl}
            title="Пригласить"
            shareText={INVITE_SHARE_TEXT}
            onClose={() => setShareOpen(false)}
          />
        )}
      </AnimatePresence>
    </Portal>
  );
}
