"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
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
  HelpCircle,
  Menu,
  Wrench,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { ConsultationIcon } from "@/components/icons/consultation-icon";
import { RequestListAvatar } from "@/components/ui/request-list-avatar";
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
import { ApplianceBrandAvatar } from "@/components/ui/appliance-brand-avatar";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
import {
  applianceDisplayKindLabel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import { applianceNeedsDetails } from "@/lib/appliance-line-sync";
import {
  areAllSafetyStagesDone,
  buildPanelSafetyStages,
} from "@/lib/panel-safety-stages";
import { loadIdentifyContext } from "@/lib/panel-identify";
import { findWiringCheckRequestForPanel } from "@/lib/wiring-check-request";
import { hapticContextMenu } from "@/lib/haptics";
import { safetyBadgeColors } from "@/lib/safety-score";
import {
  PanelSafetyBarSheetHost,
  PanelSafetyStages,
} from "@/components/ui/panel-safety-stages";
import {
  persistInstallRequest,
  persistPanel,
  restoreDeletedHomeItem,
} from "@/lib/user-data";
import { APP_VERSION } from "@/lib/app-version";
import {
  consumeHomeExpandPanelForAppliances,
  readHomeCollapsedPanelIds,
  writeHomeCollapsedPanelIds,
} from "@/lib/home-expanded";
import { cn } from "@/lib/utils";
import type {
  HomeAppliance,
  HomeListItem,
  InstallRequest,
  PanelObject,
} from "@/types";
import { installStatusTone, isStandaloneAiConsultation } from "@/types";
import {
  formatPanelListMeta,
  panelSupportsHomeAppliances,
} from "@/lib/panel-list-meta";
import { getNoPanelSetup } from "@/lib/no-panel-setups";
import { isAtPanelLimit, type PanelQuota } from "@/lib/invites";

const PAGE_SPRING = { type: "spring" as const, stiffness: 420, damping: 40 };
const SWIPE_DISTANCE = 72;
const SWIPE_MIN_OFFSET = 24;
const SWIPE_VELOCITY = 550;

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

function stopCardLongPress<T extends HTMLElement>(
  bind: ReturnType<typeof useLongPressAction>["bind"],
) {
  return {
    onPointerDown: (event: React.PointerEvent<T>) => {
      event.stopPropagation();
      bind.onPointerDown(event);
    },
    onPointerMove: (event: React.PointerEvent<T>) => {
      event.stopPropagation();
      bind.onPointerMove(event);
    },
    onPointerUp: (event: React.PointerEvent<T>) => {
      event.stopPropagation();
      bind.onPointerUp();
    },
    onPointerCancel: (event: React.PointerEvent<T>) => {
      event.stopPropagation();
      bind.onPointerCancel();
    },
    onContextMenu: (event: React.MouseEvent<T>) => {
      event.stopPropagation();
      bind.onContextMenu(event);
    },
  };
}

const PANEL_CARD_RADIUS = "rounded-[24px]";
const BOOK_PEEK_PX = 5;

const panelCardShellClass =
  "min-w-0 max-w-full border border-black/[0.06] bg-white shadow-[0_1px_1px_rgba(17,17,19,0.04),0_2px_6px_rgba(17,17,19,0.04)]";

function PanelCardStack({
  peekCount,
  children,
  className,
  ...props
}: {
  peekCount: number;
  children: ReactNode;
} & ComponentPropsWithoutRef<"div">) {
  const layers = Math.min(Math.max(peekCount, 0), 5);
  const stackDepth = layers * BOOK_PEEK_PX;

  return (
    <div
      className={cn("relative min-w-0", className)}
      style={layers > 0 ? { paddingBottom: stackDepth } : undefined}
      {...props}
    >
      {layers > 0
        ? Array.from({ length: layers }, (_, index) => (
            <div
              key={index}
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 border-b border-black/12",
                panelCardShellClass,
                PANEL_CARD_RADIUS,
              )}
              style={{
                height: `calc(100% - ${stackDepth}px)`,
                transform: `translateY(${(index + 1) * BOOK_PEEK_PX}px)`,
                // Closest page sits just under the panel card.
                zIndex: layers - index,
              }}
              aria-hidden
            />
          ))
        : null}
      <div
        className={cn(
          "relative overflow-hidden",
          panelCardShellClass,
          PANEL_CARD_RADIUS,
        )}
        style={{ zIndex: layers + 10 }}
      >
        {children}
      </div>
    </div>
  );
}

function ApplianceListRow({
  appliance,
  onOpen,
  onContextMenu,
}: {
  appliance: HomeAppliance;
  onOpen: () => void;
  onContextMenu: () => void;
}) {
  const [isHolding, setIsHolding] = useState(false);
  const holdVisualTimerRef = useRef<number | null>(null);
  const longPress = useLongPressAction(() => {
    setIsHolding(false);
    hapticContextMenu();
    onContextMenu();
  });
  const kindLabel = applianceDisplayKindLabel(appliance);
  const needsDetails = applianceNeedsDetails(appliance);
  const brand = appliance.brand?.trim();
  const model = appliance.model?.trim();

  const clearHoldVisual = () => {
    if (holdVisualTimerRef.current != null) {
      window.clearTimeout(holdVisualTimerRef.current);
      holdVisualTimerRef.current = null;
    }
    setIsHolding(false);
  };

  useEffect(() => clearHoldVisual, []);

  return (
    <motion.button
      type="button"
      animate={{ scale: isHolding ? 1.03 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...stopCardLongPress({
        ...longPress.bind,
        onPointerDown: (event) => {
          clearHoldVisual();
          holdVisualTimerRef.current = window.setTimeout(() => {
            setIsHolding(true);
          }, 140);
          longPress.bind.onPointerDown(event);
        },
        onPointerUp: () => {
          clearHoldVisual();
          longPress.bind.onPointerUp();
        },
        onPointerCancel: () => {
          clearHoldVisual();
          longPress.bind.onPointerCancel();
        },
      })}
      onClick={() => {
        if (longPress.longPressedRef.current) {
          longPress.longPressedRef.current = false;
          return;
        }
        onOpen();
      }}
      className={cn(
        "relative z-[1] flex w-full origin-center items-center gap-2.5 rounded-none px-4 py-2 text-left transition-colors hover:bg-zinc-50",
        isHolding && "z-[2] bg-zinc-50 shadow-[0_8px_24px_rgba(17,17,19,0.12)]",
      )}
    >
      <ApplianceBrandAvatar
        kind={appliance.kind}
        brandLogoUrl={appliance.brandLogoUrl}
        brand={brand}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate ty-label">
          <span className="font-medium text-zinc-500">{kindLabel}</span>
          {brand ? <> {brand}</> : null}
        </span>
        {model && (
          <span className="block truncate ty-meta">{model}</span>
        )}
      </span>
      {needsDetails ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-zinc-400">
          <HelpCircle className="h-4 w-4" />
        </span>
      ) : (
        <span className="shrink-0 ty-label tabular-nums text-zinc-700">
          {formatAppliancePower(appliance.powerW)}
        </span>
      )}
    </motion.button>
  );
}

function HomeListCard({
  item,
  onOpen,
  onContextMenu,
  onCallWiringCheckMaster,
  linkedWiringRequest,
  onOpenWiringRequest,
}: {
  item: HomeListItem;
  onOpen: () => void;
  onContextMenu: () => void;
  onCallWiringCheckMaster?: (panelId: string) => void;
  linkedWiringRequest?: InstallRequest | null;
  onOpenWiringRequest?: (requestId: string) => void;
}) {
  const isRequest = item.kind === "install_request";
  const isConsultationRequest =
    isRequest && isStandaloneAiConsultation(item as InstallRequest);
  const panel = !isRequest && item.kind === "panel" ? item : null;
  const safetyStages = panel
    ? buildPanelSafetyStages({
        panel,
        applianceRooms: loadIdentifyContext(panel.id)?.applianceRooms,
      })
    : null;
  const [safetyInfoOpen, setSafetyInfoOpen] = useState(false);
  const longPress = useLongPressAction(onContextMenu);

  return (
    <div className="relative" {...longPress.bind}>
      <GlassCard className="overflow-hidden rounded-[24px] border transition-colors hover:bg-zinc-50">
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
          <div className="flex items-center gap-4 p-4 lg:p-5">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-zinc-100",
                isConsultationRequest
                  ? "text-zinc-900"
                  : isRequest
                    ? "text-zinc-500"
                    : "text-zinc-600",
              )}
            >
              {isRequest ? (
                isConsultationRequest ? (
                  <ConsultationIcon className="h-6 w-6 text-zinc-900" />
                ) : (
                  <ClipboardList className="h-6 w-6" />
                )
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
                {isRequest && !isConsultationRequest ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 ty-badge",
                      installStatusTone((item as InstallRequest).status).badge,
                    )}
                  >
                    {(item as InstallRequest).statusLabel}
                  </span>
                ) : panel?.noPanelSetupId ? (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 ty-badge text-zinc-600">
                    нет щитка
                  </span>
                ) : panel &&
                  safetyStages &&
                  areAllSafetyStagesDone(safetyStages) ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 ty-badge text-emerald-700">
                    Проверен
                  </span>
                ) : null}
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
          </div>
        </button>
        {panel && !panel.noPanelSetupId && safetyStages ? (
          <div className="border-t border-black/[0.06] px-4 py-3">
            <button
              type="button"
              onClick={() => setSafetyInfoOpen(true)}
              className="w-full text-left"
              aria-label="Этапы оценки безопасности щитка"
            >
              <PanelSafetyStages snapshot={safetyStages} variant="bar" />
            </button>
          </div>
        ) : null}
      </GlassCard>
      <PanelSafetyBarSheetHost
        open={safetyInfoOpen}
        snapshot={safetyStages}
        onClose={() => setSafetyInfoOpen(false)}
        onCallMaster={
          panel && onCallWiringCheckMaster && !linkedWiringRequest
            ? () => onCallWiringCheckMaster(panel.id)
            : undefined
        }
        linkedWiringRequest={linkedWiringRequest}
        onOpenWiringRequest={
          linkedWiringRequest && onOpenWiringRequest
            ? () => onOpenWiringRequest(linkedWiringRequest.id)
            : undefined
        }
      />
    </div>
  );
}

function RequestListCard({
  item,
  onOpen,
  onContextMenu,
  showDivider = false,
}: {
  item: InstallRequest;
  onOpen: () => void;
  onContextMenu: () => void;
  showDivider?: boolean;
}) {
  const isConsultation = isStandaloneAiConsultation(item);
  const longPress = useLongPressAction(onContextMenu);

  return (
    <div className="relative">
      <button
        type="button"
        {...longPress.bind}
        onClick={() => {
          if (longPress.longPressedRef.current) {
            longPress.longPressedRef.current = false;
            return;
          }
          onOpen();
        }}
        className="flex w-full items-stretch gap-3 px-4 py-3 text-left touch-manipulation select-none transition-colors hover:bg-zinc-50 active:bg-zinc-100 lg:cursor-pointer"
      >
        <RequestListAvatar request={item} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="truncate ty-heading text-zinc-900">
              {item.publicCode ?? item.title}
            </h2>
            {!isConsultation ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 ty-badge",
                  installStatusTone(item.status).badge,
                )}
              >
                {item.statusLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-end justify-between gap-3">
            <p className="min-w-0 flex-1 truncate ty-note text-zinc-600">
              {item.subtitle}
            </p>
            {item.createdAt ? (
              <span className="shrink-0 ty-meta text-zinc-400">
                {item.createdAt}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      {showDivider ? (
        <div className="ml-[4.75rem] border-b border-black/[0.06]" />
      ) : null}
    </div>
  );
}

function ExpandableHomeCard({
  panel,
  expanded,
  onToggle,
  onOpenPanel,
  onOpenAppliance,
  onAddAppliance,
  onApplianceContextMenu,
  onContextMenu,
  onCallWiringCheckMaster,
  linkedWiringRequest,
  onOpenWiringRequest,
}: {
  panel: PanelObject;
  expanded: boolean;
  onToggle: () => void;
  onOpenPanel: () => void;
  onOpenAppliance: (applianceId: string) => void;
  onAddAppliance: () => void;
  onApplianceContextMenu: (appliance: HomeAppliance) => void;
  onContextMenu: () => void;
  onCallWiringCheckMaster?: (panelId: string) => void;
  linkedWiringRequest?: InstallRequest | null;
  onOpenWiringRequest?: (requestId: string) => void;
}) {
  const appliances = panel.appliances ?? [];
  const supportsAppliances = panelSupportsHomeAppliances(panel);
  const longPress = useLongPressAction(onContextMenu);
  const [safetyInfoOpen, setSafetyInfoOpen] = useState(false);
  const [appliancesIntroOpen, setAppliancesIntroOpen] = useState(false);
  const safetyStages = useMemo(
    () =>
      buildPanelSafetyStages({
        panel,
        applianceRooms: loadIdentifyContext(panel.id)?.applianceRooms,
      }),
    [panel],
  );

  const requestExpand = () => {
    if (!expanded && !hasSeenAppliancesIntro()) {
      setAppliancesIntroOpen(true);
      return;
    }
    onToggle();
  };

  const showBookPages = supportsAppliances && !expanded && appliances.length > 0;

  return (
    <PanelCardStack
      peekCount={showBookPages ? appliances.length : 0}
      title={
        showBookPages ? `${appliances.length} шт. техники` : undefined
      }
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
              <h2 className="truncate ty-heading">{panel.title}</h2>
              <p className="truncate ty-note">{panel.address}</p>
              <p className="mt-1 ty-meta">{formatPanelListMeta(panel)}</p>
            </div>
          </button>

          <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 py-3 pr-2 pl-1 lg:pr-3 lg:pl-1.5">
            {panel.noPanelSetupId ? (
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 ty-badge text-zinc-600">
                нет щитка
              </span>
            ) : null}
            {supportsAppliances ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  requestExpand();
                }}
                className="ml-1 flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-800"
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
            ) : null}
          </div>
        </div>

        {!panel.noPanelSetupId ? (
          <div className="border-t border-black/[0.06] px-4 py-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSafetyInfoOpen(true);
              }}
              className="w-full text-left"
              aria-label="Этапы оценки безопасности щитка"
            >
              <PanelSafetyStages snapshot={safetyStages} variant="bar" />
            </button>
          </div>
        ) : null}

        {supportsAppliances ? (
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
                  {appliances.map((appliance) => (
                    <ApplianceListRow
                      key={appliance.id}
                      appliance={appliance}
                      onOpen={() => onOpenAppliance(appliance.id)}
                      onContextMenu={() => onApplianceContextMenu(appliance)}
                    />
                  ))}

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
        ) : null}

        <PanelSafetyBarSheetHost
          open={safetyInfoOpen}
          snapshot={safetyStages}
          onClose={() => setSafetyInfoOpen(false)}
          onCallMaster={
            onCallWiringCheckMaster && !linkedWiringRequest
              ? () => onCallWiringCheckMaster(panel.id)
              : undefined
          }
          linkedWiringRequest={linkedWiringRequest}
          onOpenWiringRequest={
            linkedWiringRequest && onOpenWiringRequest
              ? () => onOpenWiringRequest(linkedWiringRequest.id)
              : undefined
          }
        />

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

    </PanelCardStack>
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
  showMaintenance = false,
  homeAppliancesMode = false,
  onAddAppliance,
  onOpenAppliance,
  onDeleteAppliance,
  onRestoreAppliance,
  onCallWiringCheckMaster,
  onOpenWiringRequest,
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
  showMaintenance?: boolean;
  homeAppliancesMode?: boolean;
  onAddAppliance?: (panelId: string, appliance: HomeAppliance) => void;
  onOpenAppliance?: (panelId: string, applianceId: string) => void;
  onDeleteAppliance?: (panelId: string, applianceId: string) => void;
  onRestoreAppliance?: (
    panelId: string,
    appliance: HomeAppliance,
    index: number,
  ) => void;
  onCallWiringCheckMaster?: (panelId: string) => void;
  onOpenWiringRequest?: (requestId: string) => void;
  initialPage?: 0 | 1;
  onPageChange?: (page: 0 | 1) => void;
}) {
  const [page, setPage] = useState<0 | 1>(initialPage);
  const [pendingDelete, setPendingDelete] = useState<HomeListItem | null>(null);
  const [pendingApplianceDelete, setPendingApplianceDelete] = useState<{
    panelId: string;
    appliance: HomeAppliance;
    index: number;
  } | null>(null);
  const [actionsItemId, setActionsItemId] = useState<string | null>(null);
  const [applianceActions, setApplianceActions] = useState<{
    panelId: string;
    appliance: HomeAppliance;
  } | null>(null);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [collapsedPanelIds, setCollapsedPanelIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [addApplianceOpen, setAddApplianceOpen] = useState(false);
  const [addAppliancePanelId, setAddAppliancePanelId] = useState<string | null>(
    null,
  );
  const collapsedInitRef = useRef(false);
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
    if (collapsedInitRef.current || panels.length === 0) return;
    collapsedInitRef.current = true;
    const expandForAppliances = consumeHomeExpandPanelForAppliances();
    const collapsed = readHomeCollapsedPanelIds(panels.map((panel) => panel.id));
    if (expandForAppliances) {
      collapsed.delete(expandForAppliances);
    }
    setCollapsedPanelIds(collapsed);
  }, [panels]);

  useEffect(() => {
    if (!collapsedInitRef.current) return;
    writeHomeCollapsedPanelIds(collapsedPanelIds);
  }, [collapsedPanelIds]);

  const isPanelExpanded = (panel: PanelObject) =>
    panelSupportsHomeAppliances(panel) && !collapsedPanelIds.has(panel.id);

  const togglePanelExpanded = (panelId: string) => {
    setCollapsedPanelIds((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) next.delete(panelId);
      else next.add(panelId);
      return next;
    });
  };

  const expandPanel = (panelId: string) => {
    setCollapsedPanelIds((prev) => {
      if (!prev.has(panelId)) return prev;
      const next = new Set(prev);
      next.delete(panelId);
      return next;
    });
  };

  const requests = useMemo(
    () =>
      items.filter(
        (item): item is InstallRequest =>
          item.kind === "install_request" &&
          !(pendingDelete && item.id === pendingDelete.id),
      ),
    [items, pendingDelete],
  );
  const linkedConsultationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const request of requests) {
      if (request.linkedRequestId) {
        ids.add(request.linkedRequestId);
      }
    }
    return ids;
  }, [requests]);
  const visibleRequests = useMemo(
    () => requests.filter((request) => !linkedConsultationIds.has(request.id)),
    [requests, linkedConsultationIds],
  );
  const atPanelLimit = isAtPanelLimit(quota, panels.length);
  const panelEmptyText =
    "Щиток — электрическое сердце дома. Сфотографируйте, чтобы оценить его состояние, и добавлять в дальнейшем остальную технику";
  const panelEmpty = {
    icon: <BreakerIcon className="h-10 w-10" />,
    text: panelEmptyText,
    framed: true,
    imageSrc: "/empty-states/panels.png",
    imageAlt: "Бытовая техника вокруг электрического щитка",
  };
  const requestEmpty = {
    icon: <ClipboardList className="h-10 w-10" />,
    text: "Здесь можно обратиться за любой помощью в электрике. Поможем как онлайн, так и со скорой помощью на дом",
    framed: true,
    imageSrc: "/empty-states/requests.png",
    imageAlt: "Мастер пришёл помочь с электрикой",
  };
  const bothEmpty =
    !loading && panels.length === 0 && visibleRequests.length === 0;

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
  }, [panels.length, visibleRequests.length]);

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

  const renderRequestItem = (
    request: InstallRequest,
    options?: { showDivider?: boolean },
  ) => (
    <RequestListCard
      item={request}
      onOpen={() => onOpenRequest(request.id)}
      onContextMenu={() => setActionsItemId(request.id)}
      showDivider={options?.showDivider}
    />
  );

  const renderRequestsList = (
    requests: InstallRequest[],
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
    if (requests.length === 0) {
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
      <div className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white">
        {requests.map((request, index) => (
          <div key={request.id}>
            {renderRequestItem(request, {
              showDivider: index < requests.length - 1,
            })}
          </div>
        ))}
      </div>
    );
  };

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
              obj.kind === "install_request" ? (
                renderRequestItem(obj)
              ) : (
                <HomeListCard
                  item={obj}
                  onOpen={() => onOpenPanel(obj.id)}
                  onContextMenu={() => setActionsItemId(obj.id)}
                  onCallWiringCheckMaster={onCallWiringCheckMaster}
                  linkedWiringRequest={findWiringCheckRequestForPanel(
                    items,
                    obj.id,
                  )}
                  onOpenWiringRequest={onOpenWiringRequest}
                />
              )
            ) : obj.kind === "install_request" ? (
              renderRequestItem(obj)
            ) : (
              <ExpandableHomeCard
                panel={obj}
                expanded={isPanelExpanded(obj)}
                onToggle={() => togglePanelExpanded(obj.id)}
                onOpenPanel={() => onOpenPanel(obj.id)}
                onOpenAppliance={(applianceId) =>
                  onOpenAppliance?.(obj.id, applianceId)
                }
                onAddAppliance={() => {
                  expandPanel(obj.id);
                  setAddAppliancePanelId(obj.id);
                  setAddApplianceOpen(true);
                }}
                onApplianceContextMenu={(appliance) =>
                  setApplianceActions({ panelId: obj.id, appliance })
                }
                onContextMenu={() => setActionsItemId(obj.id)}
                onCallWiringCheckMaster={onCallWiringCheckMaster}
                linkedWiringRequest={findWiringCheckRequestForPanel(
                  items,
                  obj.id,
                )}
                onOpenWiringRequest={onOpenWiringRequest}
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
            if (item.id === "maintenance" && !showMaintenance) return false;
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
                {loading ? "…" : visibleRequests.length}
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
                <Button
                  className="h-11 rounded-full px-5 text-[2.125rem] font-semibold leading-none"
                  onClick={addPanel}
                  aria-label="Добавить щиток"
                >
                  +
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
          : renderRequestsList(visibleRequests, requestEmpty)}
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
            {renderRequestsList(visibleRequests, requestEmpty)}
          </div>
        </motion.div>
      </div>
        </>
      )}

      <div className="shrink-0 border-t border-black/[0.06] bg-[var(--bg)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
        {page === 0 ? (
          <div className="space-y-3">
            <Button
              className="w-full rounded-full text-[2.125rem] font-semibold leading-none"
              onClick={addPanel}
              aria-label="Добавить щиток"
            >
              +
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
            showMaintenance={showMaintenance}
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
            preferredPanelId={addAppliancePanelId}
            onClose={() => {
              setAddApplianceOpen(false);
              setAddAppliancePanelId(null);
            }}
            onSave={(panelId, appliance) => {
              onAddAppliance(panelId, appliance);
              expandPanel(panelId);
              setAddAppliancePanelId(panelId);
              setAddApplianceOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {applianceActions && (
          <ItemActionsSheet
            title={applianceDisplayKindLabel(applianceActions.appliance)}
            subtitle={
              applianceActions.appliance.brand?.trim() ||
              "Производитель не указан"
            }
            description="Что сделать с техникой?"
            renameLabel="Изменить"
            onClose={() => setApplianceActions(null)}
            onRename={() => {
              const { panelId, appliance } = applianceActions;
              setApplianceActions(null);
              onOpenAppliance?.(panelId, appliance.id);
            }}
            onDelete={() => {
              const { panelId, appliance } = applianceActions;
              const panel = panels.find((item) => item.id === panelId);
              const index =
                panel?.appliances?.findIndex((item) => item.id === appliance.id) ??
                -1;
              setApplianceActions(null);
              setPendingApplianceDelete({ panelId, appliance, index });
              onDeleteAppliance?.(panelId, appliance.id);
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
            : pendingApplianceDelete
              ? {
                  key: `appliance-${pendingApplianceDelete.appliance.id}`,
                  message: "Техника будет удалена",
                  onUndo: () => {
                    const snapshot = pendingApplianceDelete;
                    setPendingApplianceDelete(null);
                    onRestoreAppliance?.(
                      snapshot.panelId,
                      snapshot.appliance,
                      snapshot.index,
                    );
                  },
                  onCommit: () => {
                    setPendingApplianceDelete(null);
                  },
                }
              : null
        }
      />
    </motion.section>
  );
}
