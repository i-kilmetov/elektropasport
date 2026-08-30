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
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
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
import { PushEnableBanner } from "@/components/ui/push-enable-banner";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
import {
  applianceKindIcon,
  applianceDisplayKindLabel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import {
  persistInstallRequest,
  persistPanel,
  restoreDeletedHomeItem,
} from "@/lib/user-data";
import { APP_VERSION } from "@/lib/app-version";
import {
  readHomeExpandedPanelId,
  writeHomeExpandedPanelId,
} from "@/lib/home-expanded";
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
import { formatPanelListMeta } from "@/lib/panel-list-meta";
import { getNoPanelSetup } from "@/lib/no-panel-setups";
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

function PanelListIcon({ panel }: { panel: PanelObject }) {
  if (panel.noPanelSetupId) {
    const Icon = getNoPanelSetup(panel.noPanelSetupId).icon;
    return <Icon className="h-7 w-7" strokeWidth={1.75} />;
  }
  return <BreakerIcon className="h-7 w-7" />;
}

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
            ) : panel ? (
              <PanelListIcon panel={panel} />
            ) : (
              <BreakerIcon className="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h2 className="truncate ty-heading">
                {isRequest && item.publicCode ? item.publicCode : item.title}
              </h2>
              {isRequest ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 ty-badge",
                    installStatusTone(item.status).badge,
                  )}
                >
                  {item.statusLabel}
                </span>
              ) : panel?.noPanelSetupId ? (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 ty-badge text-zinc-600">
                  нет щитка
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 ty-badge text-emerald-700">
                  {panel?.phases &&
                  panel.powerKw?.trim() &&
                  typeof panel.safety === "number"
                    ? `${panel.safety}%`
                    : "—"}
                </span>
              )}
            </div>
            <p className="truncate ty-note">
              {isRequest ? item.subtitle : item.address}
            </p>
            <p className="mt-1 ty-meta">
              {panel
                ? formatPanelListMeta(panel)
                : isRequest
                  ? item.createdAt
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
            <h2 className="truncate ty-heading">
              {item.publicCode ? item.publicCode : item.title}
            </h2>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 ty-badge",
                installStatusTone(item.status).badge,
              )}
            >
              {item.statusLabel}
            </span>
          </div>
          <p className="truncate ty-note">{item.subtitle}</p>
          <p className="mt-1 ty-meta">{item.createdAt}</p>
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
            <PanelListIcon panel={panel} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate ty-heading">
              {panel.title}
            </h2>
            <p className="truncate ty-note">{panel.address}</p>
            <p className="mt-1 ty-meta">
              {formatPanelListMeta(panel)}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 py-3 pr-2 pl-1 lg:pr-3 lg:pl-1.5">
          {panel.noPanelSetupId ? (
            <span className="flex min-h-8 max-w-[3.4rem] items-center justify-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-center ty-badge leading-tight text-zinc-500">
              нет щитка
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSafetyInfoOpen(true);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 ty-badge tabular-nums text-emerald-700 transition-colors hover:bg-emerald-500/25"
              aria-label="Что значит оценка безопасности"
            >
              {hasSafetyScore ? `${panel.safety}%` : "—"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              requestExpand();
            }}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-zinc-700 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900"
            aria-expanded={expanded}
            aria-label={expanded ? "Скрыть технику" : "Показать технику"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
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
                const kindLabel = applianceDisplayKindLabel(appliance);
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
                      <span className="block truncate ty-label">
                        <span className="font-medium text-zinc-500">
                          {kindLabel}
                        </span>{" "}
                        {brand}
                      </span>
                      {model && (
                        <span className="block truncate ty-meta">
                          {model}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 ty-label tabular-nums text-zinc-700">
                      {formatAppliancePower(appliance.powerW)}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onAddAppliance}
                className="w-full rounded-none px-4 py-2.5 text-center ty-label text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
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

const EMPTY_ILLUSTRATION_CLASS =
  "pointer-events-none h-[min(40dvh,280px)] w-auto max-w-full select-none object-contain lg:h-[min(48dvh,380px)]";

type FramedEmpty = {
  icon: ReactNode;
  text: string;
  framed?: boolean;
  imageSrc?: string;
  imageAlt?: string;
};

function EmptyCartoon({
  page,
  panelEmpty,
  requestEmpty,
  onPageChange,
}: {
  page: 0 | 1;
  panelEmpty: FramedEmpty;
  requestEmpty: FramedEmpty;
  onPageChange: (next: 0 | 1) => void;
}) {
  return (
    <motion.div
      className="flex min-h-0 w-full flex-1 touch-pan-y flex-col items-center justify-center px-5 py-6 lg:px-10"
      drag="x"
      dragDirectionLock
      dragElastic={0.12}
      dragConstraints={{ left: 0, right: 0 }}
      dragMomentum={false}
      onDragEnd={(_, info: PanInfo) => {
        const { offset, velocity } = info;
        const absOffset = Math.abs(offset.x);
        const committed =
          absOffset >= SWIPE_DISTANCE ||
          (absOffset >= SWIPE_MIN_OFFSET &&
            Math.abs(velocity.x) >= SWIPE_VELOCITY);
        if (!committed) return;
        if (offset.x < 0 && page === 0) onPageChange(1);
        if (offset.x > 0 && page === 1) onPageChange(0);
      }}
    >
      <div className="flex w-full max-w-[320px] flex-col items-center lg:max-w-[420px]">
        <div className="relative h-[min(40dvh,280px)] w-full lg:h-[min(48dvh,380px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={panelEmpty.imageSrc}
            alt={page === 0 ? (panelEmpty.imageAlt ?? "") : ""}
            width={698}
            height={800}
            draggable={false}
            aria-hidden={page !== 0}
            className={cn(
              "pointer-events-none absolute inset-0 m-auto h-full w-full select-none object-contain",
              page === 0 ? "opacity-100" : "opacity-0",
            )}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={requestEmpty.imageSrc}
            alt={page === 1 ? (requestEmpty.imageAlt ?? "") : ""}
            width={698}
            height={800}
            draggable={false}
            aria-hidden={page !== 1}
            className={cn(
              "pointer-events-none absolute inset-0 m-auto h-full w-full select-none object-contain",
              page === 1 ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
        <p className="mt-4 min-h-[6.25rem] text-center ty-body">
          {page === 0 ? panelEmpty.text : requestEmpty.text}
        </p>
      </div>
    </motion.div>
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
      <div className="flex h-full min-h-full w-full flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-[320px] flex-col items-center lg:max-w-[420px]">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={imageAlt ?? ""}
              width={698}
              height={800}
              draggable={false}
              className={EMPTY_ILLUSTRATION_CLASS}
            />
          ) : null}
          <p className="mt-4 min-h-[6.25rem] text-center ty-body">
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
      <p className="max-w-[300px] ty-body">
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
  onRestoreItem,
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
  onRestoreItem?: (item: HomeListItem) => void;
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
  const [pendingDelete, setPendingDelete] = useState<HomeListItem | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(
    readHomeExpandedPanelId,
  );
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
      if (pendingDelete && item.id === pendingDelete.id) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
    return result;
  }, [items, pendingDelete]);

  useEffect(() => {
    writeHomeExpandedPanelId(expandedId);
  }, [expandedId]);
  const requests = useMemo(
    () =>
      items.filter(
        (item): item is InstallRequest =>
          item.kind === "install_request" &&
          !(pendingDelete && item.id === pendingDelete.id),
      ),
    [items, pendingDelete],
  );
  const atPanelLimit = isAtPanelLimit(quota, panels.length);
  const panelEmptyText =
    "Щиток — электрическое сердце дома. Сфотографируйте, чтобы оценить его состояние, и добавлять в дальнейшем остальную технику";
  const panelEmpty = {
    icon: <BreakerIcon className="h-10 w-10" />,
    text: panelEmptyText,
    framed: true,
    imageSrc: "/empty-states/panels.png",
    imageAlt: "Электрический щиток в квартире",
  };
  const requestEmpty = {
    icon: <ClipboardList className="h-10 w-10" />,
    text: "Здесь можно обратиться за любой помощью в электрике. Поможем как онлайн, так и со скорой помощью на дом",
    framed: true,
    imageSrc: "/empty-states/requests.png",
    imageAlt: "Мастер пришёл помочь с электрикой",
  };
  const bothEmpty =
    !loading && panels.length === 0 && requests.length === 0;

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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {list.map((obj) => (
          <div key={obj.id} className="min-w-0">
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
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-none lg:flex-row"
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
                <span className="block ty-heading">
                  {item.title}
                </span>
                <span className="block ty-note">
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
                <span className="block ty-heading text-emerald-900">
                  Режим мастера
                </span>
                <span className="block ty-note text-emerald-700/80">
                  Заявки и заказы клиентов
                </span>
              </span>
            </button>
          )}
        </nav>
        <p className="mt-4 px-3 ty-meta tabular-nums">
          {APP_VERSION}
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overscroll-none pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-8">
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
                "relative z-10 rounded-full px-3 py-1.5 ty-label transition-colors duration-300",
                page === 0 ? "text-zinc-900" : "text-zinc-500",
              )}
            >
              Щитки
              <span className="ml-1 ty-badge text-zinc-400">
                {loading ? "…" : panels.length}
              </span>
            </button>
            <button
              ref={tab1Ref}
              type="button"
              onClick={() => settlePage(1)}
              className={cn(
                "relative z-10 rounded-full px-3 py-1.5 ty-label transition-colors duration-300",
                page === 1 ? "text-zinc-900" : "text-zinc-500",
              )}
            >
              Заявки
              <span className="ml-1 ty-badge text-zinc-400">
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
                    className="ty-body underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
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
                    className="ty-body underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
                  >
                    Я электрик
                  </button>
                )}
                <Button className="h-11 rounded-full px-5" onClick={onHelpElectrical}>
                  <GeminiSparkle className="h-5 w-5" />
                  Помочь с электрикой
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <PushEnableBanner />

      {error && (
        <p className="mx-5 mb-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 ty-note text-rose-700 lg:mx-10">
          {error}
        </p>
      )}

      {bothEmpty ? (
        <EmptyCartoon
          page={page}
          panelEmpty={panelEmpty}
          requestEmpty={requestEmpty}
          onPageChange={settlePage}
        />
      ) : (
        <>
      <div className="hidden min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none px-10 pb-10 lg:flex lg:flex-col">
        {page === 0
          ? renderList(panels, panelEmpty)
          : renderList(requests, requestEmpty)}
      </div>

      <div
        ref={pagerRef}
        className="min-h-0 flex-1 overflow-hidden overscroll-none lg:hidden"
      >
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
            className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-none px-5 pb-2"
            style={{ width: pagerWidth || "50%", WebkitOverflowScrolling: "touch" }}
          >
            {renderList(panels, panelEmpty)}
          </div>
          <div
            className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-none px-5 pb-2"
            style={{ width: pagerWidth || "50%", WebkitOverflowScrolling: "touch" }}
          >
            {renderList(requests, requestEmpty)}
          </div>
        </motion.div>
      </div>
        </>
      )}

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
                className="w-full text-center ty-subtitle underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
              >
                У меня нет щитка
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full rounded-full" onClick={onHelpElectrical}>
              <GeminiSparkle className="h-5 w-5" />
              Помочь с электрикой
            </Button>
            {onBecomeMaster && (
              <button
                type="button"
                onClick={onBecomeMaster}
                className="w-full text-center ty-subtitle underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800"
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
              setPendingDelete(actionsItem);
              setActionsItemId(null);
              onDeleteItem(actionsItem.id);
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
                onUndo: () => {
                  const restored =
                    restoreDeletedHomeItem(pendingDelete.id) ?? pendingDelete;
                  setPendingDelete(null);
                  onRestoreItem?.(restored);
                  if (restored.kind === "panel") {
                    void persistPanel(restored).catch((error) => {
                      console.error(error);
                    });
                  } else {
                    void persistInstallRequest(restored).catch((error) => {
                      console.error(error);
                    });
                  }
                },
                onCommit: () => {
                  setPendingDelete(null);
                },
              }
            : null
        }
      />
    </motion.section>
  );
}
