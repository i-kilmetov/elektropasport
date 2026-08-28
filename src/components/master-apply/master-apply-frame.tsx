"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const MASTER_YELLOW_BTN =
  "border-0 !bg-[#D3DA00] text-[#111113] shadow-none hover:!bg-[#c8cf00] hover:brightness-100";

export function MasterApplyFrame({
  onBack,
  title,
  children,
  footer,
  bodyClassName,
}: {
  onBack: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#111113] text-white"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="mb-5 flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {title ? (
            <h1 className="ty-title text-white">{title}</h1>
          ) : null}
        </header>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none pb-4",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="mt-auto shrink-0 space-y-3 pt-3">{footer}</div>
        ) : null}
      </div>
    </motion.section>
  );
}
