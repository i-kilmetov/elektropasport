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
import { hapticContextMenu } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { HomeListItem } from "@/types";

/** Hold duration before context menu — close to iOS Haptic Touch. */
const LONG_PRESS_MS = 480;
/** Delay before the lift/scale starts (avoids flicker on quick taps). */
const LIFT_DELAY_MS = 90;
/** Cancel long-press if the finger moves more than this (px). */
const MOVE_CANCEL_PX = 10;

function HomeListCard({
  item,
  lifted,
  pressing,
  onOpen,
  onContextMenu,
  onPressingChange,
}: {
  item: HomeListItem;
  lifted: boolean;
  pressing: boolean;
  onOpen: () => void;
  onContextMenu: () => void;
  onPressingChange: (pressing: boolean) => void;
}) {
  const isRequest = item.kind === "install_request";
  const longPressedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const liftTimerRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimers = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (liftTimerRef.current != null) {
      window.clearTimeout(liftTimerRef.current);
      liftTimerRef.current = null;
    }
  };

  const endPress = () => {
    clearTimers();
    startPointRef.current = null;
    onPressingChange(false);
  };

  const startPress = (clientX: number, clientY: number) => {
    longPressedRef.current = false;
    clearTimers();
    startPointRef.current = { x: clientX, y: clientY };
    onPressingChange(false);

    liftTimerRef.current = window.setTimeout(() => {
      onPressingChange(true);
    }, LIFT_DELAY_MS);

    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      onPressingChange(true);
      hapticContextMenu();
      onContextMenu();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    const start = startPointRef.current;
    if (!start) return;
    const dx = Math.abs(clientX - start.x);
    const dy = Math.abs(clientY - start.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
      endPress();
    }
  };

  const active = pressing || lifted;

  return (
    <motion.div
      animate={{
        scale: active ? 1.055 : 1,
        y: active ? -2 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 28,
        mass: 0.7,
      }}
      className={cn(
        "origin-center will-change-transform",
        active && "relative z-20",
      )}
      style={{
        filter: active
          ? "drop-shadow(0 14px 28px rgba(17,17,19,0.18))"
          : "drop-shadow(0 0 0 rgba(0,0,0,0))",
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
          }
          onOpen();
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          startPress(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => onPointerMove(e.clientX, e.clientY)}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
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
            ) : item.kind === "panel" &&
              item.devices &&
              item.devices.length > 0 ? (
              <SchemeMiniPreview
                devices={item.devices}
                railCount={item.railCount}
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
                {item.title}
              </h2>
                          {isRequest ? (
                            <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              {item.statusLabel}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              {item.phases &&
                              item.powerKw?.trim() &&
                              typeof item.safety === "number"
                                ? `${item.safety}%`
                                : "—"}
                            </span>
                          )}
            </div>
            <p
              className={cn(
                "truncate text-[13px]",
                isRequest ? "text-rose-700/80" : "text-zinc-500",
              )}
            >
              {isRequest ? item.subtitle : item.address}
            </p>
            <p
              className={cn(
                "mt-1 text-[12px]",
                isRequest ? "text-rose-600/70" : "text-zinc-400",
              )}
            >
              {isRequest
                ? `Статус: ${item.statusLabel} · ${item.createdAt}`
                : `${item.breakers} устройств · ${item.lastCheck}`}
            </p>
          </div>
        </GlassCard>
      </button>
    </motion.div>
  );
}

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
  const [pressingId, setPressingId] = useState<string | null>(null);

  const pendingDelete = items.find((item) => item.id === pendingDeleteId);
  const actionsItem = items.find((item) => item.id === actionsItemId);
  const renameItem = items.find((item) => item.id === renameItemId);

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
          items.map((obj, i) => (
            <motion.div
              key={obj.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
            >
              <SwipeableRow onDelete={() => setPendingDeleteId(obj.id)}>
                <HomeListCard
                  item={obj}
                  pressing={pressingId === obj.id}
                  lifted={actionsItemId === obj.id}
                  onOpen={() =>
                    obj.kind === "install_request"
                      ? onOpenRequest(obj.id)
                      : onOpenPanel(obj.id)
                  }
                  onContextMenu={() => setActionsItemId(obj.id)}
                  onPressingChange={(next) =>
                    setPressingId(next ? obj.id : null)
                  }
                />
              </SwipeableRow>
            </motion.div>
          ))
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
            onClose={() => {
              setActionsItemId(null);
              setPressingId(null);
            }}
            onRename={() => {
              setRenameItemId(actionsItem.id);
              setActionsItemId(null);
              setPressingId(null);
            }}
            onDelete={() => {
              setPendingDeleteId(actionsItem.id);
              setActionsItemId(null);
              setPressingId(null);
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
