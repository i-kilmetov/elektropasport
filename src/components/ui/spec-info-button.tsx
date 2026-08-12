"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getCharacteristicHint } from "@/lib/characteristic-hints";
import { cn } from "@/lib/utils";

export function SpecCharacteristicCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const hint = getCharacteristicHint(label);

  return (
    <GlassCard className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-white/40">{label}</div>
          <div className="mt-1 text-[15px] font-medium leading-snug text-white">
            {value}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Пояснение: ${label}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            open
              ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
              : "border-white/10 bg-white/5 text-white/45 hover:text-white/70",
          )}
        >
          <Info className="h-3 w-3" strokeWidth={2.25} />
        </button>
      </div>
      {open && (
        <p className="mt-2.5 border-t border-white/8 pt-2.5 text-[12px] leading-relaxed text-white/55">
          {hint}
        </p>
      )}
    </GlassCard>
  );
}
