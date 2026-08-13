"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getCharacteristicHint } from "@/lib/characteristic-hints";
import { cn } from "@/lib/utils";

export function HintInfoButton({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors",
        open
          ? "bg-zinc-200 text-zinc-700"
          : "bg-zinc-200 text-zinc-500 hover:text-zinc-600",
      )}
    >
      <Info className="h-3 w-3" strokeWidth={2.25} />
    </button>
  );
}

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
          <div className="text-[12px] text-zinc-500">{label}</div>
          <div className="mt-1 text-[15px] font-medium leading-snug text-zinc-900">
            {value}
          </div>
        </div>
        <HintInfoButton
          label={`Пояснение: ${label}`}
          open={open}
          onToggle={() => setOpen((v) => !v)}
        />
      </div>
      {open && (
        <p className="mt-2.5 border-t border-black/[0.06] pt-2.5 text-[12px] leading-relaxed text-zinc-500">
          {hint}
        </p>
      )}
    </GlassCard>
  );
}
