"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  ClipboardList,
  Home,
  X,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { HomeSafetyArt } from "@/components/icons/home-safety-art";
import { SchemeMiniPreview } from "@/components/icons/scheme-mini-preview";
import {
  MAIN_MENU_ITEMS,
  type MainMenuId,
} from "@/components/screens/main-menu-sheet";
import { HomeScreenSkeleton } from "@/components/ui/home-list-skeleton";
import { HomeTabBar, type HomeTabId } from "@/components/ui/home-tab-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { ItemActionsSheet } from "@/components/ui/item-actions-sheet";
import { NameDialog } from "@/components/ui/name-dialog";
import { hapticContextMenu, hapticNav } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type {
  HomeListItem,
  InstallRequest,
  ObjectType,
  PanelObject,
} from "@/types";
import { installStatusTone } from "@/types";
import { isAtPanelLimit, type PanelQuota } from "@/lib/invites";

const LONG_PRESS_MS = 480;
const LIFT_DELAY_MS = 90;
const MOVE_CANCEL_PX = 10;
const PROMO_DISMISS_KEY = "elektropasport:home-promo-dismissed";

const PANEL_TYPE_LABEL: Record<ObjectType, string> = {
  apartment: "Квартира",
  house: "Дом",
  garage: "Гараж",
  dacha: "Дача",
};

function PressableCard({
  lifted,
  pressing,
  onOpen,
  onContextMenu,
  onPressingChange,
  children,
}: {
  lifted: boolean;
  pressing: boolean;
  onOpen: () => void;
  onContextMenu: () => void;
  onPressingChange: (pressing: boolean) => void;
  children: ReactNode;
}) {
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
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) endPress();
  };

  const active = pressing || lifted;

  return (
    <motion.div
      animate={{ scale: active ? 1.03 : 1, y: active ? -2 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
      className={cn("origin-center will-change-transform", active && "relative z-20")}
      style={{
        filter: active
          ? "drop-shadow(0 14px 28px rgba(17,17,19,0.16))"
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
        className="w-full text-left select-none lg:cursor-pointer"
      >
        {children}
      </button>
    </motion.div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
      {children}
    </span>
  );
}

function PanelHomeCard({
  item,
  lifted,
  pressing,
  onOpen,
  onContextMenu,
  onPressingChange,
}: {
  item: PanelObject;
  lifted: boolean;
  pressing: boolean;
  onOpen: () => void;
  onContextMenu: () => void;
  onPressingChange: (pressing: boolean) => void;
}) {
  const safetyKnown = typeof item.safety === "number";
  const chips = [
    PANEL_TYPE_LABEL[item.type],
    item.phases === "3" ? "3 фазы" : item.phases === "1" ? "1 фаза" : null,
    item.powerKw?.trim()
      ? `${item.powerKw.replace(".", ",")} кВт`
      : null,
    item.hasGround === true
      ? "Есть земля"
      : item.hasGround === false
        ? "Нет земли"
        : null,
    `${item.breakers} устройств`,
  ].filter(Boolean) as string[];

  return (
    <PressableCard
      lifted={lifted}
      pressing={pressing}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
      onPressingChange={onPressingChange}
    >
      <GlassCard className="rounded-[24px] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-zinc-100">
            {item.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photoDataUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : item.devices && item.devices.length > 0 ? (
              <SchemeMiniPreview
                devices={item.devices}
                railCount={item.railCount}
                className="h-14 w-14"
              />
            ) : (
              <BreakerIcon className="h-7 w-7 text-zinc-600" />
            )}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              safetyKnown
                ? "bg-emerald-500/12 text-emerald-700"
                : "bg-zinc-100 text-zinc-500",
            )}
          >
            {safetyKnown ? `${item.safety}%` : "Оценка —"}
          </span>
        </div>
        <h2 className="text-[16px] font-semibold leading-tight text-zinc-900">
          {item.title}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-zinc-500">
          {item.address || "Адрес не указан"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">{item.lastCheck}</p>
      </GlassCard>
    </PressableCard>
  );
}

function RequestHomeCard({
  item,
  lifted,
  pressing,
  onOpen,
  onContextMenu,
  onPressingChange,
}: {
  item: InstallRequest;
  lifted: boolean;
  pressing: boolean;
  onOpen: () => void;
  onContextMenu: () => void;
  onPressingChange: (pressing: boolean) => void;
}) {
  const chips = [
    item.dwelling === "house"
      ? "Дом"
      : item.dwelling === "apartment"
        ? "Квартира"
        : null,
    item.phases === "3" ? "3 фазы" : item.phases === "1" ? "1 фаза" : null,
    item.powerKw?.trim()
      ? `${item.powerKw.replace(".", ",")} кВт`
      : null,
    item.setupTitle || null,
  ].filter(Boolean) as string[];

  return (
    <PressableCard
      lifted={lifted}
      pressing={pressing}
      onOpen={onOpen}
      onContextMenu={onContextMenu}
      onPressingChange={onPressingChange}
    >
      <GlassCard className="rounded-[24px] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-500">
            <ClipboardList className="h-6 w-6" />
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              installStatusTone(item.status).badge,
            )}
          >
            {item.statusLabel}
          </span>
        </div>
        <h2 className="text-[16px] font-semibold leading-tight text-zinc-900">
          {item.publicCode || item.title}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-zinc-500">
          {item.subtitle || item.exactAddress || item.city || "Заявка"}
        </p>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-zinc-400">{item.createdAt}</p>
      </GlassCard>
    </PressableCard>
  );
}

function SafetyPromoBanner({
  onDetails,
  onDismiss,
}: {
  onDetails: () => void;
  onDismiss: () => void;
}) {
  return (
    <GlassCard className="relative rounded-[24px] p-4">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label="Скрыть"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-3.5 pr-5">
        <div className="h-[72px] w-[72px] shrink-0">
          <HomeSafetyArt />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-zinc-900">
            Теперь станет безопаснее
          </p>
          <p className="mt-1 text-[12px] leading-snug text-zinc-500">
            Разберём щиток и покажем, где риски.
          </p>
          <Button
            size="sm"
            className="mt-2.5 h-8 rounded-full px-3.5 text-[13px] shadow-none"
            onClick={onDetails}
          >
            Подробнее
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] bg-white px-4 py-6 text-center text-[13px] leading-relaxed text-zinc-500 shadow-[0_1px_1px_rgba(17,17,19,0.04),0_2px_6px_rgba(17,17,19,0.04)]">
      {text}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2.5 px-0.5 text-[15px] font-semibold text-zinc-900">
      {children}
    </h2>
  );
}

export function ObjectsScreen({
  items,
  loading = false,
  error = null,
  quota = null,
  onAdd,
  onOpenPanel,
  onOpenRequest,
  onDeleteItem,
  onRenameItem,
  onNoPanel,
  onMenuSelect,
  onPanelLimit,
}: {
  items: HomeListItem[];
  loading?: boolean;
  error?: string | null;
  quota?: PanelQuota | null;
  onAdd: () => void;
  onOpenPanel: (id: string) => void;
  onOpenRequest: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onRenameItem: (id: string, name: string) => void;
  onNoPanel: () => void;
  onMenuSelect: (id: MainMenuId) => void;
  onPanelLimit?: () => void;
}) {
  const [tab, setTab] = useState<HomeTabId>("home");
  const [promoVisible, setPromoVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);

  const panels = items.filter((item): item is PanelObject => item.kind === "panel");
  const requests = items.filter(
    (item): item is InstallRequest => item.kind === "install_request",
  );
  const atPanelLimit = isAtPanelLimit(quota);
  const pendingDelete = items.find((item) => item.id === pendingDeleteId);
  const actionsItem = items.find((item) => item.id === actionsItemId);
  const renameItem = items.find((item) => item.id === renameItemId);

  useEffect(() => {
    try {
      setPromoVisible(localStorage.getItem(PROMO_DISMISS_KEY) !== "1");
    } catch {
      setPromoVisible(true);
    }
  }, []);

  const dismissPromo = () => {
    setPromoVisible(false);
    try {
      localStorage.setItem(PROMO_DISMISS_KEY, "1");
    } catch {
      // private mode
    }
  };

  const changeTab = (next: HomeTabId) => {
    hapticNav();
    setTab(next);
  };

  const addPanel = () => {
    if (atPanelLimit) {
      onPanelLimit?.();
      return;
    }
    onAdd();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f4f6]"
    >
      <header
        className={cn(
          "shrink-0 px-5 lg:px-10",
          tab === "home"
            ? "pt-[max(0.75rem,env(safe-area-inset-top))] pb-1"
            : "pt-[max(1.15rem,env(safe-area-inset-top))] pb-2",
        )}
      >
        {tab !== "home" && (
          <h1 className="text-[17px] font-semibold text-zinc-900">
            {tab === "add" ? "Добавить" : "Меню"}
          </h1>
        )}
      </header>

      {error && (
        <p className="mx-5 mb-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 lg:mx-10">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 lg:px-10">
        {tab === "home" && (
          <div className="mx-auto w-full max-w-xl space-y-5 lg:max-w-2xl">
            {loading ? (
              <HomeScreenSkeleton />
            ) : (
              <>
                {promoVisible && (
                  <SafetyPromoBanner
                    onDetails={() => onMenuSelect("about")}
                    onDismiss={dismissPromo}
                  />
                )}

                <section>
                  <SectionTitle>Щитки</SectionTitle>
                  {panels.length === 0 ? (
                    <EmptyBlock text="Просто сфотографируйте щиток. Дальше расскажем, что в нём и как это работает." />
                  ) : (
                    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                      {panels.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * i }}
                        >
                          <PanelHomeCard
                            item={item}
                            pressing={pressingId === item.id}
                            lifted={actionsItemId === item.id}
                            onOpen={() => onOpenPanel(item.id)}
                            onContextMenu={() => setActionsItemId(item.id)}
                            onPressingChange={(next) =>
                              setPressingId(next ? item.id : null)
                            }
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <SectionTitle>Заявки</SectionTitle>
                  {requests.length === 0 ? (
                    <EmptyBlock text="Здесь появятся заявки, оформленные по сценарию «У меня нет щитка»." />
                  ) : (
                    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                      {requests.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * i }}
                        >
                          <RequestHomeCard
                            item={item}
                            pressing={pressingId === item.id}
                            lifted={actionsItemId === item.id}
                            onOpen={() => onOpenRequest(item.id)}
                            onContextMenu={() => setActionsItemId(item.id)}
                            onPressingChange={(next) =>
                              setPressingId(next ? item.id : null)
                            }
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {tab === "add" && (
          <div className="mx-auto w-full max-w-xl space-y-3 lg:max-w-2xl">
            <button
              type="button"
              onClick={addPanel}
              className="w-full text-left"
            >
              <GlassCard className="flex items-center gap-3.5 rounded-[24px] p-4 transition-colors hover:bg-zinc-50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-zinc-900 text-white">
                  <Camera className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-zinc-900">
                    Добавить щиток
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-zinc-500">
                    Сфотографируйте щиток — соберём схему и оценку безопасности.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </GlassCard>
            </button>
            <button
              type="button"
              onClick={onNoPanel}
              className="w-full text-left"
            >
              <GlassCard className="flex items-center gap-3.5 rounded-[24px] p-4 transition-colors hover:bg-zinc-50">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-zinc-100 text-zinc-700">
                  <Home className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-zinc-900">
                    У меня нет щитка
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-zinc-500">
                    Подберём решение и мастера, если щиток ещё не собран.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </GlassCard>
            </button>
          </div>
        )}

        {tab === "menu" && (
          <div className="mx-auto w-full max-w-xl lg:max-w-2xl">
            <GlassCard className="divide-y divide-black/[0.06] rounded-[24px] p-0">
              {MAIN_MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onMenuSelect(item.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-zinc-100 text-zinc-700">
                    <item.icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-zinc-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-zinc-500">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300" />
                </button>
              ))}
            </GlassCard>
          </div>
        )}
      </div>

      <HomeTabBar active={tab} onChange={changeTab} />

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
