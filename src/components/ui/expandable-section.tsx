"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
  icon,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard className={cn("overflow-hidden p-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#D3DA00] text-[#111113]">
            {icon}
          </span>
        ) : null}
        <span className="ty-heading min-w-0 flex-1">{title}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ty-body border-t border-black/[0.06] px-4 pb-4 pt-3">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassCard>
  );
}
