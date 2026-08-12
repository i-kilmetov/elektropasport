"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Menu, Plus } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { SchemeMiniPreview } from "@/components/icons/scheme-mini-preview";
import {
  MainMenuSheet,
  type MainMenuId,
} from "@/components/screens/main-menu-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { ItemActionsSheet } from "@/components/ui/item-actions-sheet";
import { NameDialog } from "@/components/ui/name-dialog";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { cn } from "@/lib/utils";
import type { HomeListItem } from "@/types";

const LONG_PRESS_MS = 420;

export function ObjectsScreen({
  items,
  loading = false,
  error = null,
  onAdd,
  onOpenPanel,
  onOpenRequest,
  onDeleteItem,
  onRenameItem,
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
  onRenameItem: (id: string, name: string) => void;
  onNoPanel: () => void;
  onMenuSelect: (id: MainMenuId) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const longPressedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const pendingDelete = items.find((item) => item.id === pendingDeleteId);
  const actionsItem = items.find((item) => item.id === actionsItemId);
  const renameItem = items.find((item) => item.id === renameItemId);

  const clearPressTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startLongPress = (id: string) => {
    longPressedRef.current = false;
    clearPressTimer();
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      setActionsItemId(id);
    }, LONG_PRESS_MS);
  };

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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">Мои щитки</h1>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_6px_20px_rgba(17,17,19,0.18)]"
          aria-label="Добавить щиток"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {error && (
        <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col gap-3">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-[15px] text-zinc-500">Загрузка…</p>
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col items-center justify-center px-4 text-center"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-black/8 bg-zinc-100 text-[var(--accent)]">
              <BreakerIcon className="h-10 w-10" />
            </div>
            <p className="max-w-[300px] text-[15px] leading-relaxed text-zinc-500">
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
                    onClick={() => {
                      if (longPressedRef.current) {
                        longPressedRef.current = false;
                        return;
                      }
                      if (isRequest) onOpenRequest(obj.id);
                      else onOpenPanel(obj.id);
                    }}
                    onPointerDown={() => startLongPress(obj.id)}
                    onPointerUp={clearPressTimer}
                    onPointerLeave={clearPressTimer}
                    onPointerCancel={clearPressTimer}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full touch-manipulation text-left select-none"
                  >
                    <GlassCard
                      className={cn(
                        "flex items-center gap-4 rounded-[24px] border p-4 transition-colors",
                        isRequest
                          ? "border-rose-200 bg-rose-50 hover:bg-rose-100/70"
                          : "hover:bg-zinc-50",
                      )}
                    >
                      <div
                        className={cn(
                          "h-14 w-14 shrink-0 overflow-hidden rounded-[18px]",
                          isRequest
                            ? "flex items-center justify-center bg-rose-500/15 text-rose-500"
                            : "bg-zinc-100",
                        )}
                      >
                        {isRequest ? (
                          <ClipboardList className="h-6 w-6" />
                        ) : obj.kind === "panel" &&
                          obj.devices &&
                          obj.devices.length > 0 ? (
                          <SchemeMiniPreview
                            devices={obj.devices}
                            railCount={obj.railCount}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-[var(--accent)]">
                            <BreakerIcon className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <h2
                            className={cn(
                              "truncate text-[17px] font-semibold",
                              isRequest ? "text-rose-900" : "text-zinc-900",
                            )}
                          >
                            {obj.title}
                          </h2>
                          {isRequest ? (
                            <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              {obj.statusLabel}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              {obj.safety}%
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "truncate text-[13px]",
                            isRequest ? "text-rose-700/80" : "text-zinc-500",
                          )}
                        >
                          {isRequest ? obj.subtitle : obj.address}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[12px]",
                            isRequest ? "text-rose-600/70" : "text-zinc-400",
                          )}
                        >
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
          className="w-full text-center text-[15px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
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
        {actionsItem && (
          <ItemActionsSheet
            title={actionsItem.title}
            onClose={() => setActionsItemId(null)}
            onRename={() => {
              setRenameItemId(actionsItem.id);
              setActionsItemId(null);
            }}
            onDelete={() => {
              setPendingDeleteId(actionsItem.id);
              setActionsItemId(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameItem && (
          <NameDialog
            title={
              renameItem.kind === "panel"
                ? "Переименовать щиток"
                : "Переименовать заявку"
            }
            description={
              renameItem.kind === "panel"
                ? "Например: «Квартира», «Дача», «Щиток на кухне»"
                : "Короткое название, чтобы быстрее найти заявку"
            }
            placeholder={
              renameItem.kind === "panel" ? "Название щитка" : "Название заявки"
            }
            initialValue={renameItem.title}
            confirmLabel="Сохранить"
            onCancel={() => setRenameItemId(null)}
            onConfirm={(name) => {
              onRenameItem(renameItem.id, name);
              setRenameItemId(null);
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
