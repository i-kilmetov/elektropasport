"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Infinity, UserPlus, X, Zap } from "lucide-react";
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

const points = [
  {
    icon: Zap,
    text: "Каждому пользователю доступно добавление одного щитка.",
  },
  {
    icon: Infinity,
    text: "Чтобы снять ограничения и добавлять любое количество щитков, пригласите хотя бы одного человека.",
  },
  {
    icon: Heart,
    text: "Этот сервис будет полезен каждому. Смело приглашайте своих родных и близких.",
  },
] as const;

export function PanelLimitSheet({
  quota,
  onClose,
}: {
  quota: PanelQuota;
  onClose: () => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const canInvite = Boolean(quota.inviteUrl);
  const unlocked = Boolean(quota.unlimited);

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
                {unlocked ? "Лимит щитков снят" : "Пригласите человека"}
              </h2>
              <p className="mt-1 text-[13px] text-zinc-500">
                {unlocked
                  ? "Можно добавлять любое количество щитков"
                  : `${quota.panelCount} из ${BASE_PANEL_LIMIT} ${panelWord(BASE_PANEL_LIMIT)} без приглашения`}
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

          {!unlocked && (
            <ul className="space-y-3">
              {points.map((point) => (
                <li key={point.text} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-zinc-100 text-zinc-700">
                    <point.icon className="h-4 w-4" />
                  </span>
                  <p className="pt-1 text-[15px] leading-relaxed text-zinc-600">
                    {point.text}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {canInvite && (
            <Button
              className={unlocked ? "mt-1 w-full" : "mt-5 w-full"}
              onClick={() => setShareOpen(true)}
            >
              <UserPlus className="h-5 w-5" />
              Пригласить пользователя
            </Button>
          )}

          <div className={unlocked ? "mt-5" : "mt-6"}>
            <h3 className="mb-2 text-[14px] font-medium text-zinc-600">
              Приглашённые
            </h3>
            {quota.events.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Пока никто не открыл вашу ссылку. Когда новый человек зайдёт в
                приложение по вашей ссылке, лимит щитков снимется.
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
                        {event.username && (
                          <p className="mt-0.5 truncate text-[12px] text-zinc-400">
                            @{event.username}
                          </p>
                        )}
                        <p
                          className={cn(
                            "mt-0.5 text-[13px] leading-relaxed",
                            event.outcome === "credited"
                              ? "text-emerald-700"
                              : "text-zinc-500",
                          )}
                        >
                          {event.outcome === "credited"
                            ? "Новый пользователь — лимит снят"
                            : "Уже был в сервисе — лимит не снят"}
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
