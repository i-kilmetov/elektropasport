"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Info, Wrench, X } from "lucide-react";

const items = [
  {
    id: "about" as const,
    title: "О сервисе",
    description: "Как работает Электропаспорт",
    icon: Info,
  },
  {
    id: "electrical" as const,
    title: "Важное об электрике",
    description: "ПУЭ и базовые правила безопасности",
    icon: BookOpen,
  },
  {
    id: "master" as const,
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
  onSelect: (id: "about" | "electrical" | "master") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[28px] border border-white/10 bg-[#16161d] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold text-white">Меню</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
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
              className="flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.07]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--accent)]/15 text-[var(--accent)]">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-white">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-[13px] text-white/45">
                  {item.description}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-white/30" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
