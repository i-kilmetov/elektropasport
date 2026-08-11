"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Menu, Plus } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { MainMenuSheet } from "@/components/screens/main-menu-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import type { HomeListItem } from "@/types";

export function ObjectsScreen({
  items,
  loading = false,
  error = null,
  onAdd,
  onOpenPanel,
  onOpenRequest,
  onDeleteItem,
  onNoPanel,
  onMenuSelect,
}: {
  items: HomeListItem[];
  loading?: boolean;
  error?: string | null;
  onAdd: () => void;
  onOpenPanel: (id: string) => void;
  onOpenRequest: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onNoPanel: () => void;
  onMenuSelect: (id: "about" | "electrical" | "master") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingDelete = items.find((item) => item.id === pendingDeleteId);

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl"
          aria-label="Меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Мои щитки</h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_6px_24px_rgba(124,92,255,0.4)]"
          aria-label="Добавить щиток"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {error && (
        <p className="mb-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-[15px] text-white/50">Загрузка…</p>
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center px-4 text-center"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-[var(--accent)]">
              <BreakerIcon className="h-10 w-10" />
            </div>
            <p className="max-w-[300px] text-[15px] leading-relaxed text-white/50">
              Сфотографируйте существующий щиток или расскажите, как у вас
              устроена электрика без него.
            </p>
          </motion.div>
        ) : (
          items.map((obj, i) => {
            const isRequest = obj.kind === "install_request";
            return (
              <motion.div
                key={obj.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i }}
              >
                <SwipeableRow onDelete={() => setPendingDeleteId(obj.id)}>
                  <button
                    type="button"
                    onClick={() =>
                      isRequest ? onOpenRequest(obj.id) : onOpenPanel(obj.id)
                    }
                    className="w-full text-left"
                  >
                    <GlassCard className="flex items-center gap-4 rounded-[24px] p-4 transition-colors hover:bg-white/[0.09]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/10 text-[var(--accent)]">
                        {isRequest ? (
                          <ClipboardList className="h-6 w-6" />
                        ) : (
                          <BreakerIcon className="h-7 w-7" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <h2 className="truncate text-[17px] font-semibold text-white">
                            {obj.title}
                          </h2>
                          {isRequest ? (
                            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
                              {obj.statusLabel}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                              {obj.safety}%
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[13px] text-white/45">
                          {isRequest ? obj.subtitle : obj.address}
                        </p>
                        <p className="mt-1 text-[12px] text-white/35">
                          {isRequest
                            ? `Статус: ${obj.statusLabel} · ${obj.createdAt}`
                            : `${obj.breakers} устройств · ${obj.lastCheck}`}
                        </p>
                      </div>
                    </GlassCard>
                  </button>
                </SwipeableRow>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="mt-6 space-y-4">
        <Button className="w-full" onClick={onAdd}>
          <Plus className="h-5 w-5" />
          Добавить щиток
        </Button>
        <button
          type="button"
          onClick={onNoPanel}
          className="w-full text-center text-[15px] font-medium text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white/85"
        >
          У меня нет щитка
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <MainMenuSheet
            onClose={() => setMenuOpen(false)}
            onSelect={(id) => {
              setMenuOpen(false);
              onMenuSelect(id);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDialog
            title={
              pendingDelete.kind === "panel"
                ? "Удалить щиток?"
                : "Удалить заявку?"
            }
            description={
              pendingDelete.kind === "panel"
                ? "Щиток и его схема будут удалены без возможности восстановления."
                : "Заявка будет удалена без возможности восстановления."
            }
            confirmLabel="Удалить"
            onCancel={() => setPendingDeleteId(null)}
            onConfirm={() => {
              const id = pendingDelete.id;
              setPendingDeleteId(null);
              onDeleteItem(id);
            }}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
