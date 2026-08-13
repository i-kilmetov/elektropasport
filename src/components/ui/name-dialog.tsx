"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";

export function NameDialog({
  title,
  description = "Например: «Квартира», «Дача», «Щиток на кухне»",
  placeholder = "Название",
  initialValue,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description?: string;
  placeholder?: string;
  initialValue: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
        onClick={onCancel}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
        >
          <h3 className="mb-2 text-[20px] font-semibold text-zinc-900">
            {title}
          </h3>
          {description && (
            <p className="mb-4 text-[14px] text-zinc-500">{description}</p>
          )}
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="mb-4 h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
            }}
          />
          <div className="flex gap-3">
            <Button className="flex-1" variant="secondary" onClick={onCancel}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              disabled={!value.trim()}
              onClick={() => onConfirm(value.trim())}
            >
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
