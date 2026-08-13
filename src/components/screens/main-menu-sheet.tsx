"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Info,
  MessageCircle,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Portal } from "@/components/ui/portal";

export type MainMenuId = "profile" | "about" | "feedback" | "master";

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
    id: "about",
    title: "О сервисе",
    description: "Как работает Электропаспорт",
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

export function MainMenuSheet({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (id: MainMenuId) => void;
}) {
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto w-full max-w-[430px] rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-zinc-900">Меню</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
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
