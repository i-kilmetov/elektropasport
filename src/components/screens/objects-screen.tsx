"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  type PanInfo,
} from "framer-motion";
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
import { hapticContextMenu } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { HomeListItem, InstallRequest, PanelObject } from "@/types";

/** Hold duration before context menu — close to iOS Haptic Touch. */
const LONG_PRESS_MS = 480;
const LIFT_DELAY_MS = 90;
const MOVE_CANCEL_PX = 10;
const PAGE_SPRING = { type: "spring" as const, stiffness: 380, damping: 38 };
/** Ignore taps and tiny jitter; only a real horizontal swipe changes tabs. */
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 700;
const SWIPE_MIN_OFFSET = 28;

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

function EmptyState({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-black/8 bg-zinc-100 text-[var(--accent)]">
        {icon}
      </div>
      <p className="max-w-[300px] text-[15px] leading-relaxed text-zinc-500">
        {text}
      </p>
    </div>
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
  onSubmitRequest,
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
  onSubmitRequest: () => void;
  onMenuSelect: (id: MainMenuId) => void;
}) {
  const [page, setPage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [pagerWidth, setPagerWidth] = useState(0);
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const x = useMotionValue(0);

  const panels = useMemo(
    () => items.filter((item): item is PanelObject => item.kind === "panel"),
    [items],
  );
  const requests = useMemo(
    () =>
      items.filter(
        (item): item is InstallRequest => item.kind === "install_request",
      ),
    [items],
  );

  const pendingDelete = items.find((item) => item.id === pendingDeleteId);
  const actionsItem = items.find((item) => item.id === actionsItemId);
  const renameItem = items.find((item) => item.id === renameItemId);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    const node = pagerRef.current;
    if (!node) return;
    const update = () => setPagerWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pagerWidth) return;
    void animate(x, -page * pagerWidth, PAGE_SPRING);
  }, [page, pagerWidth, x]);

  const snapTo = (next: 0 | 1) => {
    if (!pagerWidth) return;
    void animate(x, -next * pagerWidth, PAGE_SPRING);
  };

  const settlePage = (next: 0 | 1) => {
    pageRef.current = next;
    setPage(next);
    snapTo(next);
  };

  const onPagerDragEnd = (_: unknown, info: PanInfo) => {
    const current = pageRef.current as 0 | 1;
    const { offset, velocity } = info;
    const absOffset = Math.abs(offset.x);
    const committed =
      absOffset >= SWIPE_DISTANCE ||
      (absOffset >= SWIPE_MIN_OFFSET && Math.abs(velocity.x) >= SWIPE_VELOCITY);

    if (!committed) {
      snapTo(current);
      return;
    }

    if (offset.x < 0 && current === 0) {
      settlePage(1);
      return;
    }
    if (offset.x > 0 && current === 1) {
      settlePage(0);
      return;
    }
    snapTo(current);
  };

  const renderList = (
    list: HomeListItem[],
    empty: { icon: ReactNode; text: string },
  ) => {
    if (loading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <p className="text-[15px] text-zinc-500">Загрузка…</p>
        </div>
      );
    }
    if (list.length === 0) {
      return <EmptyState icon={empty.icon} text={empty.text} />;
    }
    return (
      <div className="flex flex-col gap-3">
        {list.map((obj, i) => (
          <motion.div
            key={obj.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
          >
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
              onPressingChange={(next) => setPressingId(next ? obj.id : null)}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh flex-col overflow-hidden pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-4 px-5">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => settlePage(0)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                page === 0 ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500",
              )}
            >
              Щитки
              <span className="ml-1 text-[11px] font-medium text-zinc-400">
                {panels.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => settlePage(1)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                page === 1 ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500",
              )}
            >
              Заявки
              <span className="ml-1 text-[11px] font-medium text-zinc-400">
                {requests.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {error && (
        <p className="mx-5 mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </p>
      )}

      <div ref={pagerRef} className="min-h-0 flex-1 overflow-hidden">
        <motion.div
          className="flex h-full touch-pan-y"
          drag="x"
          dragDirectionLock
          dragElastic={0.16}
          dragConstraints={{
            left: pagerWidth ? -pagerWidth : 0,
            right: 0,
          }}
          dragMomentum={false}
          style={{
            x,
            width: pagerWidth ? pagerWidth * 2 : "200%",
          }}
          onDragEnd={onPagerDragEnd}
        >
          <div
            className="flex h-full min-h-0 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            style={{ width: pagerWidth || "50%" }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              {renderList(panels, {
                icon: <BreakerIcon className="h-10 w-10" />,
                text: "Сфотографируйте существующий щиток или расскажите, как у вас устроена электрика без него.",
              })}
            </div>
            <div className="shrink-0 space-y-3 border-t border-black/[0.06] bg-[var(--bg)] pt-3">
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
          </div>
          <div
            className="flex h-full min-h-0 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            style={{ width: pagerWidth || "50%" }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              {renderList(requests, {
                icon: <ClipboardList className="h-10 w-10" />,
                text: "Здесь появятся ваши заявки на консультацию, проект, сборку щитка или монтаж.",
              })}
            </div>
            <div className="shrink-0 border-t border-black/[0.06] bg-[var(--bg)] pt-3">
              <Button className="w-full" onClick={onSubmitRequest}>
                Отправить заявку
              </Button>
            </div>
          </div>
        </motion.div>
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
