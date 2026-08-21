"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { ChevronDown, ClipboardList, Menu, Plus, Wrench, Zap } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { AddApplianceSheet } from "@/components/screens/add-appliance-sheet";
import {
  MainMenuSheet,
  MAIN_MENU_ITEMS,
  type MainMenuId,
} from "@/components/screens/main-menu-sheet";
import { HomeListSkeleton } from "@/components/ui/home-list-skeleton";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { ItemActionsSheet } from "@/components/ui/item-actions-sheet";
import { NameDialog } from "@/components/ui/name-dialog";
import { formatAppliancePower } from "@/lib/home-appliances";
import { hapticContextMenu } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type {
  HomeAppliance,
  HomeListItem,
  InstallRequest,
  PanelObject,
} from "@/types";
import { installStatusTone } from "@/types";
import { isAtPanelLimit, type PanelQuota } from "@/lib/invites";

/** Hold duration before context menu — close to iOS Haptic Touch. */
const LONG_PRESS_MS = 480;
const LIFT_DELAY_MS = 90;
const MOVE_CANCEL_PX = 10;
const PAGE_SPRING = { type: "spring" as const, stiffness: 380, damping: 38 };
/** Ignore taps and tiny jitter; only a real horizontal swipe changes tabs. */
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 700;
const SWIPE_MIN_OFFSET = 28;

function RequestListCard({
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
        className="w-full text-left select-none lg:cursor-pointer"
      >
        <GlassCard className="flex items-center gap-4 rounded-[24px] border p-4 transition-colors hover:bg-zinc-50 lg:p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-zinc-100 text-zinc-500">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h2 className="truncate text-[17px] font-semibold text-zinc-900">
                {item.publicCode ? item.publicCode : item.title}
              </h2>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  installStatusTone(item.status).badge,
                )}
              >
                {item.statusLabel}
              </span>
            </div>
            <p className="truncate text-[13px] text-zinc-500">{item.subtitle}</p>
            <p className="mt-1 text-[12px] text-zinc-400">{item.createdAt}</p>
          </div>
        </GlassCard>
      </button>
    </motion.div>
  );
}

function ExpandableHomeCard({
  panel,
  expanded,
  lifted,
  pressing,
  onToggle,
  onOpenPanel,
  onOpenAppliance,
  onContextMenu,
  onPressingChange,
}: {
  panel: PanelObject;
  expanded: boolean;
  lifted: boolean;
  pressing: boolean;
  onToggle: () => void;
  onOpenPanel: () => void;
  onOpenAppliance: (applianceId: string) => void;
  onContextMenu: () => void;
  onPressingChange: (pressing: boolean) => void;
}) {
  const longPressedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const liftTimerRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const appliances = panel.appliances ?? [];

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
        scale: active ? 1.02 : 1,
        y: active ? -1 : 0,
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
      <GlassCard className="overflow-hidden rounded-[24px] border p-0">
        <button
          type="button"
          onClick={() => {
            if (longPressedRef.current) {
              longPressedRef.current = false;
              return;
            }
            onToggle();
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
          className="flex w-full items-center gap-4 p-4 text-left select-none transition-colors hover:bg-zinc-50 lg:p-5"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-zinc-100 text-zinc-600">
            <BreakerIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h2 className="truncate text-[17px] font-semibold text-zinc-900">
                {panel.title}
              </h2>
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                {panel.phases &&
                panel.powerKw?.trim() &&
                typeof panel.safety === "number"
                  ? `${panel.safety}%`
                  : "—"}
              </span>
            </div>
            <p className="truncate text-[13px] text-zinc-500">{panel.address}</p>
            <p className="mt-1 text-[12px] text-zinc-400">
              {appliances.length > 0
                ? `${appliances.length} приборов · ${panel.lastCheck}`
                : `Щиток · ${panel.lastCheck}`}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-2 border-t border-black/[0.06] bg-zinc-50/80 px-3 py-3">
                <button
                  type="button"
                  onClick={onOpenPanel}
                  className="flex w-full items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-zinc-100"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-amber-50 text-amber-700">
                    <BreakerIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-zinc-900">
                      Электрическое сердце
                    </span>
                    <span className="block text-[12px] text-zinc-500">
                      {panel.breakers} устройств в щитке · открыть схему
                    </span>
                  </span>
                </button>

                {appliances.map((appliance) => (
                  <button
                    key={appliance.id}
                    type="button"
                    onClick={() => onOpenAppliance(appliance.id)}
                    className="flex w-full items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-zinc-100"
                  >
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] bg-zinc-100 text-zinc-600">
                      {appliance.photoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={appliance.photoDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Zap className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-zinc-900">
                        {appliance.title}
                      </span>
                      <span className="block text-[12px] text-zinc-500">
                        {formatAppliancePower(appliance.powerW)}
                      </span>
                    </span>
                  </button>
                ))}

                {appliances.length === 0 && (
                  <p className="px-1 py-1 text-[12px] leading-relaxed text-zinc-400">
                    Добавьте бытовые приборы — холодильник, стиралку, плиту и
                    другое.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

function EmptyState({
  icon,
  text,
  framed = false,
}: {
  icon: ReactNode;
  text: string;
  framed?: boolean;
}) {
  if (framed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="max-w-[320px] rounded-[20px] border border-black/8 bg-white px-5 py-4 text-center text-[15px] leading-relaxed text-zinc-600 shadow-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] border border-black/8 bg-zinc-100 text-zinc-500">
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
  quota = null,
  onAdd,
  onOpenPanel,
  onOpenRequest,
  onDeleteItem,
  onRenameItem,
  onHelpElectrical,
  onMenuSelect,
  onPanelLimit,
  menuOpen = false,
  onMenuOpenChange,
  isMaster = false,
  onMasterMode,
  isAdmin = false,
  masterMode = false,
  onMasterModeChange,
  onAddAppliance,
  onOpenAppliance,
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
  onHelpElectrical: () => void;
  onMenuSelect: (id: MainMenuId) => void;
  onPanelLimit?: () => void;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  isMaster?: boolean;
  onMasterMode?: () => void;
  isAdmin?: boolean;
  masterMode?: boolean;
  onMasterModeChange?: (next: boolean) => void;
  onAddAppliance: (panelId: string, appliance: HomeAppliance) => void;
  onOpenAppliance: (panelId: string, applianceId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addApplianceOpen, setAddApplianceOpen] = useState(false);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [tabMetrics, setTabMetrics] = useState({
    left0: 4,
    width0: 0,
    left1: 4,
    width1: 0,
  });
  const pagerRef = useRef<HTMLDivElement>(null);
  const tab0Ref = useRef<HTMLButtonElement>(null);
  const tab1Ref = useRef<HTMLButtonElement>(null);
  const pageRef = useRef(0);
  const x = useMotionValue(0);
  const rawTabProgress = useTransform(
    x,
    [0, pagerWidth > 0 ? -pagerWidth : -1],
    [0, 1],
  );
  const tabProgress = useTransform(rawTabProgress, (t) =>
    Math.min(1, Math.max(0, t)),
  );
  const pillLeft = useTransform(tabProgress, [0, 1], [
    tabMetrics.left0,
    tabMetrics.left1,
  ]);
  const pillWidth = useTransform(tabProgress, [0, 1], [
    tabMetrics.width0,
    tabMetrics.width1,
  ]);
  const tab0Color = useTransform(tabProgress, [0, 1], ["#18181b", "#71717a"]);
  const tab1Color = useTransform(tabProgress, [0, 1], ["#71717a", "#18181b"]);

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
  const atPanelLimit = isAtPanelLimit(quota, panels.length);

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

  useLayoutEffect(() => {
    const first = tab0Ref.current;
    const second = tab1Ref.current;
    if (!first || !second) return;
    const measure = () => {
      setTabMetrics({
        left0: first.offsetLeft,
        width0: first.offsetWidth,
        left1: second.offsetLeft,
        width1: second.offsetWidth,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(first);
    observer.observe(second);
    return () => observer.disconnect();
  }, [panels.length, requests.length]);

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
    empty: { icon: ReactNode; text: string; framed?: boolean },
  ) => {
    if (loading) {
      return <HomeListSkeleton count={3} />;
    }
    if (list.length === 0) {
      return (
        <EmptyState
          icon={empty.icon}
          text={empty.text}
          framed={empty.framed}
        />
      );
    }
    return (
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {list.map((obj, i) => (
          <motion.div
            key={obj.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
          >
            {obj.kind === "install_request" ? (
              <RequestListCard
                item={obj}
                pressing={pressingId === obj.id}
                lifted={actionsItemId === obj.id}
                onOpen={() => onOpenRequest(obj.id)}
                onContextMenu={() => setActionsItemId(obj.id)}
                onPressingChange={(next) =>
                  setPressingId(next ? obj.id : null)
                }
              />
            ) : (
              <ExpandableHomeCard
                panel={obj}
                expanded={expandedId === obj.id}
                pressing={pressingId === obj.id}
                lifted={actionsItemId === obj.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === obj.id ? null : obj.id))
                }
                onOpenPanel={() => onOpenPanel(obj.id)}
                onOpenAppliance={(applianceId) =>
                  onOpenAppliance(obj.id, applianceId)
                }
                onContextMenu={() => setActionsItemId(obj.id)}
                onPressingChange={(next) =>
                  setPressingId(next ? obj.id : null)
                }
              />
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  const handlePrimaryAdd = () => {
    if (panels.length === 0) {
      if (atPanelLimit) {
        onPanelLimit?.();
        return;
      }
      onAdd();
      return;
    }
    setAddApplianceOpen(true);
  };

  const addAnotherPanel = () => {
    setAddApplianceOpen(false);
    if (atPanelLimit) {
      onPanelLimit?.();
      return;
    }
    onAdd();
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
    >
      <aside className="hidden w-72 shrink-0 flex-col border-r border-black/[0.06] bg-zinc-50/70 px-6 py-8 lg:flex">
        <div className="mb-8">
          <BrandLogo className="h-8" />
        </div>
        <nav className="flex flex-1 flex-col space-y-1.5">
          {MAIN_MENU_ITEMS.filter((item) => {
            if (item.id === "master" && isMaster) return false;
            return true;
          }).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMenuSelect(item.id)}
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors hover:bg-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-zinc-600 shadow-sm">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-zinc-900">
                  {item.title}
                </span>
                <span className="block text-[12px] text-zinc-500">
                  {item.description}
                </span>
              </span>
            </button>
          ))}
          {(isMaster || isAdmin) && onMasterModeChange && (
            <button
              type="button"
              onClick={() => onMasterModeChange(true)}
              className="mt-auto flex w-full items-center gap-3 rounded-[16px] bg-emerald-50 px-3 py-2.5 text-left transition-colors hover:bg-emerald-100/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-emerald-100 text-emerald-700 shadow-sm">
                <Wrench className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-emerald-900">
                  Режим мастера
                </span>
                <span className="block text-[12px] text-emerald-700/80">
                  Заявки и заказы клиентов
                </span>
              </span>
            </button>
          )}
        </nav>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-8">
      <header className="mb-4 shrink-0 px-5 lg:px-10">
        <div className="relative flex items-center justify-center lg:justify-between">
          <button
            type="button"
            onClick={() => onMenuOpenChange?.(true)}
            className="absolute left-0 flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900 lg:hidden"
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative flex rounded-full bg-zinc-100 p-1">
            {tabMetrics.width0 > 0 && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-full bg-white shadow-sm"
                style={{ left: pillLeft, width: pillWidth }}
              />
            )}
            <motion.button
              ref={tab0Ref}
              type="button"
              onClick={() => settlePage(0)}
              style={{ color: tab0Color }}
              className="relative z-10 rounded-full px-3 py-1.5 text-[13px] font-semibold"
            >
              Щитки
              <span className="ml-1 text-[11px] font-medium text-zinc-400">
                {loading ? "…" : panels.length}
              </span>
            </motion.button>
            <motion.button
              ref={tab1Ref}
              type="button"
              onClick={() => settlePage(1)}
              style={{ color: tab1Color }}
              className="relative z-10 rounded-full px-3 py-1.5 text-[13px] font-semibold"
            >
              Заявки
              <span className="ml-1 text-[11px] font-medium text-zinc-400">
                {loading ? "…" : requests.length}
              </span>
            </motion.button>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            {page === 0 ? (
              <Button className="h-11 px-5" onClick={handlePrimaryAdd}>
                <Plus className="h-5 w-5" />
                Добавить
              </Button>
            ) : (
              <Button className="h-11 px-5" onClick={onHelpElectrical}>
                Помочь с электрикой
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <p className="mx-5 mb-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 lg:mx-10">
          {error}
        </p>
      )}

      <div className="hidden min-h-0 flex-1 overflow-y-auto px-10 pb-10 lg:flex lg:flex-col">
        {page === 0
          ? renderList(panels, {
              icon: <BreakerIcon className="h-10 w-10" />,
              text: "Современный дом начинается с электрического сердца — сфотографируйте щиток.",
              framed: true,
            })
          : renderList(requests, {
              icon: <ClipboardList className="h-10 w-10" />,
              text: "Здесь появятся заявки на помощь с электрикой.",
            })}
      </div>

      <div ref={pagerRef} className="min-h-0 flex-1 overflow-hidden lg:hidden">
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
            className="flex h-full min-h-0 flex-col px-5 lg:px-10"
            style={{ width: pagerWidth || "50%" }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              {renderList(panels, {
                icon: <BreakerIcon className="h-10 w-10" />,
                text: "Современный дом начинается с электрического сердца — сфотографируйте щиток.",
                framed: true,
              })}
            </div>
          </div>
          <div
            className="flex h-full min-h-0 flex-col px-5 lg:px-10"
            style={{ width: pagerWidth || "50%" }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              {renderList(requests, {
                icon: <ClipboardList className="h-10 w-10" />,
                text: "Здесь появятся заявки на помощь с электрикой.",
              })}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="shrink-0 border-t border-black/[0.06] bg-[var(--bg)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        {page === 0 ? (
          <Button className="w-full" onClick={handlePrimaryAdd}>
            <Plus className="h-5 w-5" />
            Добавить
          </Button>
        ) : (
          <Button className="w-full" onClick={onHelpElectrical}>
            Помочь с электрикой
          </Button>
        )}
      </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <MainMenuSheet
            onClose={() => onMenuOpenChange?.(false)}
            onSelect={(id) => {
              onMenuSelect(id);
            }}
            isMaster={isMaster}
            isAdmin={isAdmin}
            onMasterModeChange={
              onMasterModeChange ??
              (onMasterMode
                ? (next) => {
                    if (next) onMasterMode();
                  }
                : undefined)
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addApplianceOpen && (
          <AddApplianceSheet
            panels={panels}
            preferredPanelId={expandedId}
            onClose={() => setAddApplianceOpen(false)}
            onAddPanel={addAnotherPanel}
            onSave={(panelId, appliance) => {
              onAddAppliance(panelId, appliance);
              setExpandedId(panelId);
              setAddApplianceOpen(false);
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
