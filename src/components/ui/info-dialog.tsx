"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";

export function InfoDialog({
  title,
  description,
  actionLabel = "Понятно",
  onClose,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onClose: () => void;
}) {
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <h3 className="mb-2 ty-title">
            {title}
          </h3>
          <p className="mb-5 whitespace-pre-line ty-body">
            {description}
          </p>
          <Button className="w-full" onClick={onClose}>
            {actionLabel}
          </Button>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
