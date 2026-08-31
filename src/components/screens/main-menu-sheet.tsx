"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Gamepad2,
  GraduationCap,
  Info,
  MessageCircle,
  UserRound,
  Wrench,
  X,
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

export type MainMenuId =
  | "profile"
  | "game"
  | "school"
  | "about"
  | "feedback"
  | "master";

const items: Array<{
  id: MainMenuId;
  title: string;
  description: string;
  icon: typeof Info;
}> = [
  {
    id: "profile",
    title: "Личный кабинет",
    description: "Данные и контакты",
    icon: UserRound,
  },
  {
    id: "game",
    title: "Игра",
    description: "Пятнашки, змейка и 2048",
    icon: Gamepad2,
  },
  {
    id: "school",
    title: "Школа",
    description: "Три класса: от розетки до щитка",
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

export const MAIN_MENU_ITEMS = items;

export function MainMenuSheet({
  onClose,
  onSelect,
  isMaster = false,
  isAdmin = false,
  onMasterModeChange,
}: {
  onClose: () => void;
  onSelect: (id: MainMenuId) => void;
  isMaster?: boolean;
  isAdmin?: boolean;
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

  const visibleItems = items.filter((item) => {
    if (item.id === "master" && isMaster) return false;
    return true;
  });

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
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-zinc-100 text-zinc-600">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block ty-heading">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block ty-note">
                    {item.description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-400" />
              </button>
            ))}

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
