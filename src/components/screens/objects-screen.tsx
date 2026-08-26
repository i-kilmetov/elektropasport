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
  type PanInfo,
} from "framer-motion";
import {
  ChevronDown,
  ClipboardList,
  Menu,
  Plus,
  Wrench,
  Zap,
} from "lucide-react";
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
import { GlassCard } from "@/components/ui/glass-card";
import { InfoDialog } from "@/components/ui/info-dialog";
import { ItemActionsSheet } from "@/components/ui/item-actions-sheet";
import { NameDialog } from "@/components/ui/name-dialog";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
import {
  applianceKindIcon,
  applianceKindLabel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import { cn } from "@/lib/utils";

const PAGE_SPRING = { type: "spring" as const, stiffness: 420, damping: 40 };
const SWIPE_DISTANCE = 72;
const SWIPE_MIN_OFFSET = 24;
const SWIPE_VELOCITY = 550;
import type {
  HomeAppliance,
  HomeListItem,
  InstallRequest,
  PanelObject,
} from "@/types";
import { installStatusTone } from "@/types";
import { formatPanelAddedLabel } from "@/lib/panel-list-meta";
import { formatPanelDeviceCount } from "@/lib/panel-rails";
import { isAtPanelLimit, type PanelQuota } from "@/lib/invites";

const APPLIANCES_INTRO_KEY = "elektropasport:appliances-list-intro-seen";

function hasSeenAppliancesIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(APPLIANCES_INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

function markAppliancesIntroSeen(): void {
  try {
    localStorage.setItem(APPLIANCES_INTRO_KEY, "1");
  } catch {
    // ignore
  }
}

const LONG_PRESS_MS = 480;
const MOVE_CANCEL_PX = 10;

function useLongPressAction(onLongPress: () => void) {
  const timerRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressedRef = useRef(false);

  const clear = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
  };

  useEffect(() => clear, []);

  return {
    longPressedRef,
    bind: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        longPressedRef.current = false;
        startPointRef.current = { x: event.clientX, y: event.clientY };
        timerRef.current = window.setTimeout(() => {
          longPressedRef.current = true;
          onLongPress();
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const start = startPointRef.current;
        if (!start) return;
        const dx = Math.abs(event.clientX - start.x);
        const dy = Math.abs(event.clientY - start.y);
        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
          clear();
        }
      },
      onPointerUp: () => clear(),
      onPointerCancel: () => clear(),
      onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        onLongPress();
      },
    },
  };
}

function HomeListCard({
  item,
  onOpen,
  onContextMenu,
}: {
  item: HomeListItem;
  onOpen: () => void;
  onContextMenu: () => void;
}) {
  const isRequest = item.kind === "install_request";
  const panel = !isRequest && item.kind === "panel" ? item : null;
  const longPress = useLongPressAction(onContextMenu);

  return (
    <div className="relative" {...longPress.bind}>
      <button
        type="button"
        onClick={() => {
          if (longPress.longPressedRef.current) {
            longPress.longPressedRef.current = false;
            return;
          }
          onOpen();
        }}
        className="block w-full touch-manipulation text-left select-none lg:cursor-pointer"
      >
        <GlassCard className="flex items-center gap-4 rounded-[24px] border p-4 transition-colors hover:bg-zinc-50 lg:p-5">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-zinc-100",
              isRequest ? "text-zinc-500" : "text-zinc-600",
            )}
          >
            {isRequest ? (
              <ClipboardList className="h-6 w-6" />
            ) : (
              <BreakerIcon className="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h2 className="truncate text-[17px] font-semibold text-zinc-900">
                {isRequest && item.publicCode ? item.publicCode : item.title}
              </h2>
              {isRequest ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    installStatusTone(item.status).badge,
                  )}
                >
                  {item.statusLabel}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {panel?.phases &&
                  panel.powerKw?.trim() &&
                  typeof panel.safety === "number"
                    ? `${panel.safety}%`
                    : "—"}
                </span>
              )}
            </div>
            <p className="truncate text-[13px] text-zinc-500">
              {isRequest ? item.subtitle : item.address}
            </p>
            <p className="mt-1 text-[12px] text-zinc-400">
              {isRequest
                ? item.createdAt
                : panel
                  ? `${formatPanelDeviceCount(panel)} · добавлен ${formatPanelAddedLabel(panel)}`
                  : ""}
            </p>
          </div>
        </GlassCard>
      </button>
    </div>
  );
}

function RequestListCard({
  item,
  onOpen,
  onContextMenu,
}: {
  item: InstallRequest;
  onOpen: () => void;
  onContextMenu: () => void;
}) {
  const longPress = useLongPressAction(onContextMenu);
  return (
    <GlassCard
      className="relative flex items-center gap-2 rounded-[24px] border p-4 transition-colors hover:bg-zinc-50 lg:gap-4 lg:p-5"
      {...longPress.bind}
    >
      <button
        type="button"
        onClick={() => {
          if (longPress.longPressedRef.current) {
            longPress.longPressedRef.current = false;
            return;
          }
          onOpen();
        }}
        className="flex min-w-0 flex-1 items-center gap-4 text-left touch-manipulation select-none lg:cursor-pointer"
      >
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
      </button>
    </GlassCard>
  );
}

function ExpandableHomeCard({
  panel,
  expanded,
  onToggle,
  onOpenPanel,
  onOpenAppliance,
  onAddAppliance,
  onContextMenu,
}: {
  panel: PanelObject;
  expanded: boolean;
  onToggle: () => void;
  onOpenPanel: () => void;
  onOpenAppliance: (applianceId: string) => void;
  onAddAppliance: () => void;
  onContextMenu: () => void;
}) {
  const appliances = panel.appliances ?? [];
  const longPress = useLongPressAction(onContextMenu);
  const [safetyInfoOpen, setSafetyInfoOpen] = useState(false);
  const [appliancesIntroOpen, setAppliancesIntroOpen] = useState(false);
  const hasSafetyScore =
    Boolean(panel.phases) &&
    Boolean(panel.powerKw?.trim()) &&
    typeof panel.safety === "number";

  const requestExpand = () => {
    if (!expanded && !hasSeenAppliancesIntro()) {
      setAppliancesIntroOpen(true);
      return;
    }
    onToggle();
  };

  return (
    <GlassCard
      className="overflow-hidden rounded-[24px] border p-0"
      {...longPress.bind}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => {
            if (longPress.longPressedRef.current) {
              longPress.longPressedRef.current = false;
              return;
            }
            onOpenPanel();
          }}
          className="flex min-w-0 flex-1 touch-manipulation items-center gap-4 p-4 text-left select-none transition-colors hover:bg-zinc-50 lg:cursor-pointer lg:p-5"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-zinc-100 text-zinc-600">
            <BreakerIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold text-zinc-900">
              {panel.title}
            </h2>
            <p className="truncate text-[13px] text-zinc-500">{panel.address}</p>
            <p className="mt-1 text-[12px] text-zinc-400">
              {`${formatPanelDeviceCount(panel)} · добавлен ${formatPanelAddedLabel(panel)}`}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 py-3 pr-3 lg:pr-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSafetyInfoOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold tabular-nums text-emerald-700 transition-colors hover:bg-emerald-500/25"
            aria-label="Что значит оценка безопасности"
          >
            {hasSafetyScore ? `${panel.safety}%` : "—"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              requestExpand();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-300/70 transition-colors hover:bg-zinc-100/60 hover:text-zinc-400"
            aria-expanded={expanded}
            aria-label={expanded ? "Скрыть технику" : "Показать технику"}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-black/[0.06] border-t border-black/[0.06] bg-white">
              {appliances.map((appliance) => {
                const Icon = applianceKindIcon(appliance.kind);
                const kindLabel = applianceKindLabel(appliance.kind);
                const brand = appliance.brand?.trim() || appliance.title;
                const model = appliance.model?.trim();
                return (
                  <button
                    key={appliance.id}
                    type="button"
                    onClick={() => onOpenAppliance(appliance.id)}
                    className="flex w-full items-center gap-2.5 rounded-none px-4 py-2 text-left transition-colors hover:bg-zinc-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-zinc-100 text-zinc-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-zinc-900">
                        <span className="font-medium text-zinc-500">
                          {kindLabel}
                        </span>{" "}
                        {brand}
                      </span>
                      {model && (
                        <span className="block truncate text-[11px] text-zinc-500">
                          {model}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-zinc-700">
                      {formatAppliancePower(appliance.powerW)}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onAddAppliance}
                className="w-full rounded-none px-4 py-2.5 text-center text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
              >
                + Добавить технику
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {safetyInfoOpen && (
          <InfoDialog
            title="Оценка безопасности щитка"
            description={
              hasSafetyScore
                ? `Сейчас оценка — ${panel.safety}%.\n\nЭто сводный показатель по составу щитка, параметрам сети и нагрузкам: насколько схема защищает человека, дом от пожара и технику.\n\nЧем выше процент, тем спокойнее можно относиться к щитку. Подробный разбор и советы — внутри карточки щитка.`
                : "Здесь появится процент безопасности щитка.\n\nЧтобы его посчитать, откройте щиток и укажите фазы, выделенную мощность и наличие земли, а также подпишите линии на схеме.\n\nПока данных мало — стоит «—»."
            }
            onClose={() => setSafetyInfoOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appliancesIntroOpen && (
          <InfoDialog
            title="Техника дома"
            description={
              "В этом списке можно добавить крупную бытовую технику вашего дома: стиральную машину, холодильник, духовку и другое.\n\nТак проще понимать нагрузку на щиток и линии. Нажмите «+ Добавить технику», выберите тип, производителя и модель."
            }
            actionLabel="Понятно"
            onClose={() => {
              markAppliancesIntroSeen();
              setAppliancesIntroOpen(false);
              if (!expanded) onToggle();
            }}
          />
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function EmptyState({
  icon,
  text,
  imageSrc,
  imageAlt,
  framed = false,
}: {
  icon: ReactNode;
  text: string;
  imageSrc?: string;
  imageAlt?: string;
  framed?: boolean;
}) {
  if (framed) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-[320px] flex-col items-center">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={imageAlt ?? ""}
              draggable={false}
              className="pointer-events-none h-[min(40dvh,280px)] w-auto max-w-full select-none object-contain"
            />
          ) : null}
          <p className="mt-4 min-h-[6.25rem] text-center text-[15px] leading-relaxed text-zinc-600">
            {text}
          </p>
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
  onNoPanel,
  onHelpElectrical,
  onBecomeMaster,
  onMenuSelect,
  onPanelLimit,
  menuOpen = false,
  onMenuOpenChange,
  isMaster = false,
  onMasterMode,
  isAdmin = false,
  masterMode = false,
  onMasterModeChange,
  homeAppliancesMode = false,
  onAddAppliance,
  onOpenAppliance,
  initialPage = 0,
  onPageChange,
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
  onNoPanel?: () => void;
  onHelpElectrical: () => void;
  onBecomeMaster?: () => void;
  onMenuSelect: (id: MainMenuId) => void;
  onPanelLimit?: () => void;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  isMaster?: boolean;
  onMasterMode?: () => void;
  isAdmin?: boolean;
  masterMode?: boolean;
  onMasterModeChange?: (next: boolean) => void;
  homeAppliancesMode?: boolean;
  onAddAppliance?: (panelId: string, appliance: HomeAppliance) => void;
  onOpenAppliance?: (panelId: string, applianceId: string) => void;
  initialPage?: 0 | 1;
  onPageChange?: (page: 0 | 1) => void;
}) {
  const [page, setPage] = useState<0 | 1>(initialPage);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addApplianceOpen, setAddApplianceOpen] = useState(false);
  const [tabMetrics, setTabMetrics] = useState({
    left0: 4,
    width0: 0,
    left1: 4,
    width1: 0,
  });
  const tab0Ref = useRef<HTMLButtonElement>(null);
  const tab1Ref = useRef<HTMLButtonElement>(null);
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<0 | 1>(initialPage);
  const [pagerWidth, setPagerWidth] = useState(0);
  const pagerX = useMotionValue(0);

  const panels = useMemo(() => {
    const seen = new Set<string>();
    const result: PanelObject[] = [];
    for (const item of items) {
      if (item.kind !== "panel") continue;
      if (pendingDeleteId && item.id === pendingDeleteId) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
    return result;
  }, [items, pendingDeleteId]);
  const requests = useMemo(
    () =>
      items.filter(
        (item): item is InstallRequest =>
          item.kind === "install_request" &&
          !(pendingDeleteId && item.id === pendingDeleteId),
      ),
    [items, pendingDeleteId],
  );
  const atPanelLimit = isAtPanelLimit(quota, panels.length);
  const panelEmptyText =
    "Щиток — электрическое сердце дома. Сфотографируйте его, чтобы оценить его состояние и добавлять в дальнейшем остальную технику";

  const pendingDelete = items.find((item) => item.id === pendingDeleteId);
  const actionsItem = items.find((item) => item.id === actionsItemId);
  const renameItem = items.find((item) => item.id === renameItemId);

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

  const settlePage = (next: 0 | 1) => {
    pageRef.current = next;
    if (next !== page) {
      setPage(next);
      onPageChange?.(next);
    }
    if (pagerWidth) {
      void animate(pagerX, -next * pagerWidth, PAGE_SPRING);
    }
  };

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    setPage(initialPage);
    pageRef.current = initialPage;
  }, [initialPage]);

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
    void animate(pagerX, -page * pagerWidth, PAGE_SPRING);
  }, [page, pagerWidth, pagerX]);

  const onPagerDragEnd = (_: unknown, info: PanInfo) => {
    const current = pageRef.current;
    const { offset, velocity } = info;
    const absOffset = Math.abs(offset.x);
    const committed =
      absOffset >= SWIPE_DISTANCE ||
      (absOffset >= SWIPE_MIN_OFFSET &&
        Math.abs(velocity.x) >= SWIPE_VELOCITY);

    if (!committed) {
      settlePage(current);
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
    settlePage(current);
  };

  const pagerDragConstraints =
    pagerWidth > 0 ? { left: -pagerWidth, right: 0 } : { left: 0, right: 0 };

  const renderList = (
    list: HomeListItem[],
    empty: {
      icon: ReactNode;
      text: string;
      framed?: boolean;
      imageSrc?: string;
      imageAlt?: string;
    },
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
          imageSrc={empty.imageSrc}
          imageAlt={empty.imageAlt}
        />
      );
    }
    return (
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {list.map((obj) => (
          <div key={obj.id}>
            {!homeAppliancesMode ? (
              <HomeListCard
                item={obj}
                onOpen={() =>
                  obj.kind === "install_request"
                    ? onOpenRequest(obj.id)
                    : onOpenPanel(obj.id)
                }
                onContextMenu={() => setActionsItemId(obj.id)}
              />
            ) : obj.kind === "install_request" ? (
              <RequestListCard
                item={obj}
                onOpen={() => onOpenRequest(obj.id)}
                onContextMenu={() => setActionsItemId(obj.id)}
              />
            ) : (
              <ExpandableHomeCard
                panel={obj}
                expanded={expandedId === obj.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === obj.id ? null : obj.id))
                }
                onOpenPanel={() => onOpenPanel(obj.id)}
                onOpenAppliance={(applianceId) =>
                  onOpenAppliance?.(obj.id, applianceId)
                }
                onAddAppliance={() => {
                  setExpandedId(obj.id);
                  setAddApplianceOpen(true);
                }}
                onContextMenu={() => setActionsItemId(obj.id)}
              />
            )}
          </div>
        ))}
      </div>
    );
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
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none lg:flex-row"
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

      <div className="flex min-h-0 flex-1 flex-col overscroll-none pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-8">
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
              <div
                aria-hidden
                className="pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-full bg-white shadow-sm transition-[left,width] duration-300 ease-out"
                style={{
                  left: page === 0 ? tabMetrics.left0 : tabMetrics.left1,
                  width: page === 0 ? tabMetrics.width0 : tabMetrics.width1,
                }}
              />
            )}
            <button
              ref={tab0Ref}
              type="button"
              onClick={() => settlePage(0)}
              className={cn(
                "relative z-10 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-300",
                page === 0 ? "text-zinc-900" : "text-zinc-500",
              )}
            >
              Щитки
              <span className="ml-1 text-[11px] font-medium text-zinc-400">
                {loading ? "…" : panels.length}
              </span>
            </button>
            <button
              ref={tab1Ref}
              type="button"
              onClick={() => settlePage(1)}
              className={cn(
                "relative z-10 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-300",
                page === 1 ? "text-zinc-900" : "text-zinc-500",
              )}
            >
              Заявки
              <span className="ml-1 text-[11px] font-medium text-zinc-400">
                {loading ? "…" : requests.length}
              </span>
            </button>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            {page === 0 ? (
              <>
                {onNoPanel && (
                  <button
                    type="button"
                    onClick={onNoPanel}
                    className="text-[14px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
                  >
                    У меня нет щитка
                  </button>
                )}
                <Button className="h-11 rounded-full px-5" onClick={addPanel}>
                  <Plus className="h-5 w-5" />
                  Добавить щиток
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {onBecomeMaster && (
                  <button
                    type="button"
                    onClick={onBecomeMaster}
                    className="text-[14px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
                  >
                    Я электрик
                  </button>
                )}
                <Button className="h-11 rounded-full px-5" onClick={onHelpElectrical}>
                  <Zap className="h-5 w-5" />
                  Помочь с электрикой
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <p className="mx-5 mb-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 lg:mx-10">
          {error}
        </p>
      )}

      <div ref={pagerRef} className="min-h-0 flex-1 overflow-hidden overscroll-none">
        <motion.div
          className="flex h-full touch-pan-x overscroll-none"
          drag="x"
          dragDirectionLock
          dragElastic={0.12}
          dragConstraints={pagerDragConstraints}
          dragMomentum={false}
          style={{
            x: pagerX,
            width: pagerWidth ? pagerWidth * 2 : "200%",
          }}
          onDragEnd={onPagerDragEnd}
        >
          <div
            className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-none px-5 pb-2 lg:px-10 lg:pb-10"
            style={{ width: pagerWidth || "50%", WebkitOverflowScrolling: "touch" }}
          >
            {renderList(panels, {
              icon: <BreakerIcon className="h-10 w-10" />,
              text: panelEmptyText,
              framed: true,
              imageSrc: "/empty-states/panels.png",
              imageAlt: "Электрический щиток в квартире",
            })}
          </div>
          <div
            className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-none px-5 pb-2 lg:px-10 lg:pb-10"
            style={{ width: pagerWidth || "50%", WebkitOverflowScrolling: "touch" }}
          >
            {renderList(requests, {
              icon: <ClipboardList className="h-10 w-10" />,
              text: "Здесь можно обратиться за любой помощью в электрике. Поможем как онлайн, так и со скорой помощью на дом",
              framed: true,
              imageSrc: "/empty-states/requests.png",
              imageAlt: "Мастер пришёл помочь с электрикой",
            })}
          </div>
        </motion.div>
      </div>

      <div className="shrink-0 border-t border-black/[0.06] bg-[var(--bg)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        {page === 0 ? (
          <div className="space-y-3">
            <Button className="w-full rounded-full" onClick={addPanel}>
              <Plus className="h-5 w-5" />
              Добавить щиток
            </Button>
            {onNoPanel && (
              <button
                type="button"
                onClick={onNoPanel}
                className="w-full text-center text-[15px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
              >
                У меня нет щитка
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full rounded-full" onClick={onHelpElectrical}>
              <Zap className="h-5 w-5" />
              Помочь с электрикой
            </Button>
            {onBecomeMaster && (
              <button
                type="button"
                onClick={onBecomeMaster}
                className="w-full text-center text-[15px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
              >
                Я электрик
              </button>
            )}
          </div>
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
        {homeAppliancesMode && addApplianceOpen && onAddAppliance && (
          <AddApplianceSheet
            panels={panels}
            preferredPanelId={expandedId}
            onClose={() => setAddApplianceOpen(false)}
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

      <UndoSnackbarHost
        action={
          pendingDelete
            ? {
                key: pendingDelete.id,
                message:
                  pendingDelete.kind === "panel"
                    ? "Щиток будет удалён"
                    : "Заявка будет удалена",
                onUndo: () => setPendingDeleteId(null),
                onCommit: () => {
                  const id = pendingDelete.id;
                  setPendingDeleteId(null);
                  onDeleteItem(id);
                },
              }
            : null
        }
      />
    </motion.section>
  );
}
