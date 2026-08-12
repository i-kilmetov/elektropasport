"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";

export function ItemActionsSheet({
  title,
  onClose,
  onRename,
  onDelete,
}: {
  title: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
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
          className="w-full rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-semibold text-zinc-900">
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] text-zinc-500">Действия</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onRename}
              className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-sky-500/15 text-sky-600">
                <Pencil className="h-5 w-5" />
              </span>
              <span className="text-[16px] font-semibold text-zinc-900">
                Переименовать
              </span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-3 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3.5 text-left transition-colors hover:bg-rose-100"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-rose-500/15 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </span>
              <span className="text-[16px] font-semibold text-rose-700">
                Удалить
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
