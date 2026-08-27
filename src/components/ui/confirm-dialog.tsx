"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IosHapticHit } from "@/components/ui/ios-haptic-hit";
import { Portal } from "@/components/ui/portal";

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
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <h3 className="mb-2 text-[20px] font-semibold text-zinc-900">
            {title}
          </h3>
          <p className="mb-5 text-[14px] leading-relaxed text-zinc-500">
            {description}
          </p>
          <div className="flex gap-3">
            <Button className="relative flex-1" variant="secondary" onClick={onCancel}>
              <IosHapticHit onActivate={onCancel} />
              <span className="relative z-[2]">{cancelLabel}</span>
            </Button>
            <Button
              className={
                danger
                  ? "relative flex-1 bg-rose-500 text-white shadow-none hover:bg-rose-600"
                  : "relative flex-1"
              }
              onClick={onConfirm}
            >
              <IosHapticHit onActivate={onConfirm} />
              <span className="relative z-[2]">{confirmLabel}</span>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
