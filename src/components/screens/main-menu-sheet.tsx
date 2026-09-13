"use client";

import { useEffect, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  Gamepad2,
  GraduationCap,
  Info,
  MessageCircle,
  UserRound,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { AppleIcon, AndroidIcon } from "@/components/icons/platform-icons";
import {
  InstallAppSheet,
  type InstallAppPlatform,
} from "@/components/ui/install-app-sheet";
import { Portal } from "@/components/ui/portal";
import { APP_VERSION } from "@/lib/app-version";
import { shouldShowInstallAppPrompt } from "@/lib/web-push-client";
import { cn } from "@/lib/utils";

export type MainMenuId =
  | "profile"
  | "tariffs"
  | "maintenance"
  | "game"
  | "school"
  | "about"
  | "feedback"
  | "master";

type MenuIcon = ComponentType<{ className?: string }>;

type MenuItem = {
  id: MainMenuId;
  title: string;
  description: string;
  icon: MenuIcon;
};

const CABINET_SUBITEMS: MenuItem[] = [
  {
    id: "profile",
    title: "Профиль",
    description: "Данные и контакты",
    icon: UserRound,
  },
  {
    id: "tariffs",
    title: "Тарифы и потребление",
    description: "Ставки региона и расход техники",
    icon: Zap,
  },
  {
    id: "maintenance",
    title: "Техобслуживание",
    description: "Тест УЗО и уход за техникой",
    icon: ClipboardCheck,
  },
];

const TOP_LEVEL_ITEMS: MenuItem[] = [
  {
    id: "profile",
    title: "Личный кабинет",
    description: "Данные и контакты",
    icon: UserRound,
  },
  {
    id: "maintenance",
    title: "Техобслуживание",
    description: "Тест УЗО и уход за техникой",
    icon: ClipboardCheck,
  },
  {
    id: "game",
    title: "Игра",
    description: "Собери щиток плитками — и ещё пара мини-игр",
    icon: Gamepad2,
  },
  {
    id: "school",
    title: "Школа",
    description: "Электрика без скуки: от розетки до щитка",
    icon: GraduationCap,
  },
  {
    id: "about",
    title: "О сервисе",
    description: "Как работает Током",
    icon: Info,
  },
  {
    id: "feedback",
    title: "Обратная связь",
    description: "Баги, советы и поддержка",
    icon: MessageCircle,
  },
  {
    id: "master",
    title: "Стать мастером",
    description: "Присоединиться к команде",
    icon: Wrench,
  },
];

export const MAIN_MENU_ITEMS = TOP_LEVEL_ITEMS;

function MenuRow({
  item,
  onSelect,
  dense = false,
  nested = false,
}: {
  item: MenuItem;
  onSelect: (id: MainMenuId) => void;
  dense?: boolean;
  nested?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(
        "flex w-full items-center gap-3 text-left transition-colors",
        dense
          ? "rounded-[16px] px-3 py-2.5 hover:bg-white"
          : nested
            ? "rounded-[16px] border border-black/6 bg-white px-3.5 py-3 hover:bg-zinc-50"
            : "rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 hover:bg-zinc-100",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center text-zinc-600",
          dense
            ? "h-9 w-9 rounded-[12px] bg-white shadow-sm"
            : "h-11 w-11 rounded-[16px] bg-zinc-100",
          nested && !dense && "h-9 w-9 rounded-[12px] bg-zinc-100",
        )}
      >
        <item.icon className={dense || nested ? "h-4 w-4" : "h-5 w-5"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block ty-heading">{item.title}</span>
        <span className="mt-0.5 block ty-note">{item.description}</span>
      </span>
      {!dense ? <ArrowRight className="h-4 w-4 text-zinc-400" /> : null}
    </button>
  );
}

export function MainMenuNav({
  onSelect,
  isMaster = false,
  showMaintenance = false,
  expandCabinet = false,
  dense = false,
  className,
}: {
  onSelect: (id: MainMenuId) => void;
  isMaster?: boolean;
  showMaintenance?: boolean;
  expandCabinet?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const [cabinetOpen, setCabinetOpen] = useState(expandCabinet);

  useEffect(() => {
    if (expandCabinet) setCabinetOpen(true);
  }, [expandCabinet]);

  const restItems = TOP_LEVEL_ITEMS.filter((item) => {
    if (item.id === "profile") return !expandCabinet;
    if (item.id === "maintenance") {
      if (expandCabinet) return false;
      return showMaintenance;
    }
    if (item.id === "master" && isMaster) return false;
    return true;
  });

  const cabinetSubs = CABINET_SUBITEMS.filter((item) => {
    if (item.id === "maintenance") return showMaintenance;
    return true;
  });

  return (
    <nav className={cn("flex flex-col", dense ? "space-y-1.5" : "space-y-2", className)}>
      {expandCabinet ? (
        <div
          className={cn(
            dense
              ? "rounded-[16px]"
              : "overflow-hidden rounded-[20px] border border-black/8 bg-zinc-50",
          )}
        >
          <button
            type="button"
            onClick={() => setCabinetOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 text-left transition-colors",
              dense
                ? "rounded-[16px] px-3 py-2.5 hover:bg-white"
                : "px-4 py-3.5 hover:bg-zinc-100/80",
            )}
            aria-expanded={cabinetOpen}
          >
            <span
              className={cn(
                "flex items-center justify-center text-zinc-600",
                dense
                  ? "h-9 w-9 rounded-[12px] bg-white shadow-sm"
                  : "h-11 w-11 rounded-[16px] bg-zinc-100",
              )}
            >
              <UserRound className={dense ? "h-4 w-4" : "h-5 w-5"} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block ty-heading">Личный кабинет</span>
              <span className="mt-0.5 block ty-note">
                Профиль, тарифы и обслуживание
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-zinc-400 transition-transform",
                cabinetOpen && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {cabinetOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    "flex flex-col",
                    dense ? "space-y-1 pb-1 pl-3" : "space-y-1.5 px-2 pb-2",
                  )}
                >
                  {cabinetSubs.map((item) => (
                    <MenuRow
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      dense={dense}
                      nested={!dense}
                    />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      {restItems.map((item) => (
        <MenuRow
          key={item.id}
          item={item}
          onSelect={onSelect}
          dense={dense}
        />
      ))}
    </nav>
  );
}

export function MainMenuSheet({
  onClose,
  onSelect,
  isMaster = false,
  isAdmin = false,
  showMaintenance = false,
  expandCabinet = false,
  onMasterModeChange,
}: {
  onClose: () => void;
  onSelect: (id: MainMenuId) => void;
  isMaster?: boolean;
  isAdmin?: boolean;
  /** Isolated kill-switch + УЗО/диф (or serviceable appliances) gate. */
  showMaintenance?: boolean;
  /** Expand ЛК into Profile / Tariffs / Maintenance. */
  expandCabinet?: boolean;
  onMasterModeChange?: (next: boolean) => void;
}) {
  const [showInstallApps, setShowInstallApps] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<InstallAppPlatform | null>(
    null,
  );
  const canEnterMasterMode = (isMaster || isAdmin) && Boolean(onMasterModeChange);

  useEffect(() => {
    setShowInstallApps(shouldShowInstallAppPrompt());
  }, []);

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
          className="mx-auto flex max-h-[min(92vh,820px)] w-full max-w-[430px] flex-col rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-h-none lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
            <BrandLogo className="h-8" />
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            <MainMenuNav
              onSelect={onSelect}
              isMaster={isMaster}
              showMaintenance={showMaintenance}
              expandCabinet={expandCabinet}
            />

            {canEnterMasterMode && (
              <button
                type="button"
                onClick={() => {
                  onMasterModeChange?.(true);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-[20px] border border-emerald-500/20 bg-emerald-50 px-4 py-3.5 text-left transition-colors hover:bg-emerald-100/80"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-emerald-100 text-emerald-700">
                  <Wrench className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block ty-heading text-emerald-900">
                    Режим мастера
                  </span>
                  <span className="mt-0.5 block ty-note text-emerald-700/80">
                    Заявки и заказы клиентов
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-emerald-600/70" />
              </button>
            )}
          </div>

          <div className="mt-auto flex shrink-0 items-end justify-between gap-4 pt-5">
            {showInstallApps ? (
              <div className="flex items-end gap-4">
                <button
                  type="button"
                  onClick={() => setInstallPlatform("ios")}
                  className="text-zinc-200 transition-colors hover:text-zinc-300"
                  aria-label="Приложение для App Store"
                >
                  <AppleIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setInstallPlatform("android")}
                  className="text-zinc-200 transition-colors hover:text-zinc-300"
                  aria-label="Приложение для Play Market"
                >
                  <AndroidIcon />
                </button>
              </div>
            ) : (
              <span aria-hidden="true" />
            )}
            <p className="shrink-0 leading-none ty-meta tabular-nums text-zinc-400">
              {APP_VERSION}
            </p>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {installPlatform && (
          <InstallAppSheet
            platform={installPlatform}
            onClose={() => setInstallPlatform(null)}
          />
        )}
      </AnimatePresence>
    </Portal>
  );
}
