"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  danger = true,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[28px] border border-white/10 bg-[#16161d] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]"
      >
        <h3 className="mb-2 text-[20px] font-semibold text-white">{title}</h3>
        <p className="mb-5 text-[14px] leading-relaxed text-white/50">
          {description}
        </p>
        <div className="flex gap-3">
          <Button className="flex-1" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            className={
              danger
                ? "flex-1 bg-rose-500 text-white hover:bg-rose-500/90"
                : "flex-1"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
