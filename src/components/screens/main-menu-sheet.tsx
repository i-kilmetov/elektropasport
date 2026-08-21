"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Gamepad2,
  GraduationCap,
  Info,
  MessageCircle,
  Shield,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";

export type MainMenuId =
  | "profile"
  | "game"
  | "school"
  | "about"
  | "feedback"
  | "master"
  | "admin";

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
    description: "Змейка: собери приборы щитка",
    icon: Gamepad2,
  },
  {
    id: "school",
    title: "Школа",
    description: "Курсы по электрике с нуля",
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
  {
    id: "admin",
    title: "Админка",
    description: "Пользователи, заявки, роли",
    icon: Shield,
  },
];

export const MAIN_MENU_ITEMS = items;

export function MainMenuSheet({
  onClose,
  onSelect,
  isMaster = false,
  isAdmin = false,
  masterMode = false,
  onMasterModeChange,
}: {
  onClose: () => void;
  onSelect: (id: MainMenuId) => void;
  isMaster?: boolean;
  isAdmin?: boolean;
  /** Current app role mode (user home vs master dashboard). */
  masterMode?: boolean;
  onMasterModeChange?: (next: boolean) => void;
}) {
  const canSwitchRole = (isMaster || isAdmin) && Boolean(onMasterModeChange);

  const visibleItems = items.filter((item) => {
    if (item.id === "master" && isMaster) return false;
    if (item.id === "admin") return isAdmin;
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
          className="mx-auto w-full max-w-[430px] rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
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

          {canSwitchRole && (
            <div className="mb-3 rounded-[20px] border border-black/8 bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="text-[13px] font-medium text-zinc-500">
                  Режим работы
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    masterMode
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-200 text-zinc-600",
                  )}
                >
                  {masterMode ? "Мастер" : "Пользователь"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-[16px] bg-zinc-200/80 p-1">
                <button
                  type="button"
                  onClick={() => {
                    onMasterModeChange?.(false);
                    onClose();
                  }}
                  className={cn(
                    "rounded-[12px] px-3 py-2.5 text-[14px] font-semibold transition-colors",
                    !masterMode
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500",
                  )}
                >
                  Пользователь
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMasterModeChange?.(true);
                    onClose();
                  }}
                  className={cn(
                    "rounded-[12px] px-3 py-2.5 text-[14px] font-semibold transition-colors",
                    masterMode
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-zinc-500",
                  )}
                >
                  Мастер
                </button>
              </div>
              <p className="mt-2 px-1 text-[12px] leading-relaxed text-zinc-400">
                {masterMode
                  ? "Сейчас открыт кабинет мастера: заявки и заказы."
                  : "Сейчас открыт обычный кабинет: щитки и заявки."}
              </p>
            </div>
          )}

          <div className="space-y-2">
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
                  <span className="block text-[16px] font-semibold text-zinc-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-zinc-500">
                    {item.description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
