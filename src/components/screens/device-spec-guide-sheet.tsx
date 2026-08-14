"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getDeviceSpecGuide,
  getSpecFieldHint,
} from "@/lib/device-spec-guide";
import type { DeviceType } from "@/types";

export function DeviceSpecGuideSheet({
  type,
  open,
  onClose,
}: {
  type: DeviceType | null;
  open: boolean;
  onClose: () => void;
}) {
  const guide = type ? getDeviceSpecGuide(type) : null;

  return (
    <AnimatePresence>
      {open && guide && type && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88dvh] w-full flex-col rounded-t-[28px] border border-black/8 bg-white shadow-2xl lg:max-w-lg lg:rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 pb-4 pt-5">
              <div>
                <h3 className="text-[20px] font-semibold text-zinc-900">
                  Как подобрать: {guide.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                  {guide.intro}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {guide.fields.map((field) => (
                <GlassCard key={field.key} className="space-y-3 p-4">
                  <div>
                    <h4 className="text-[15px] font-semibold text-zinc-900">
                      {field.key}
                    </h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                      {getSpecFieldHint(field.key)}
                    </p>
                  </div>
                  <p className="text-[13px] leading-relaxed text-zinc-700">
                    <span className="font-medium text-zinc-900">
                      Как подобрать:{" "}
                    </span>
                    {field.howToPick}
                  </p>
                  {field.options.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        Частые значения
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {field.options.map((option) => (
                          <span
                            key={option}
                            className="rounded-full border border-black/8 bg-zinc-50 px-2.5 py-1 text-[12px] font-medium text-zinc-700"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))}

              <p className="rounded-[14px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900/80">
                {guide.footnote}
              </p>
            </div>

            <div className="border-t border-black/[0.06] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button className="w-full" variant="secondary" onClick={onClose}>
                Понятно
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
