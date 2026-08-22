"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getCharacteristicValueExplain,
  type CharacteristicValueExplain,
} from "@/lib/characteristic-hints";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/types";

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

function CharacteristicExplainBody({
  explain,
}: {
  explain: CharacteristicValueExplain;
}) {
  return (
    <div className="mt-2.5 space-y-3 border-t border-black/[0.06] pt-2.5">
      <p className="text-[12px] leading-relaxed text-zinc-600">
        {explain.aboutValue}
      </p>
      {explain.otherValues.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Какие ещё бывают значения
          </p>
          <ul className="space-y-2">
            {explain.otherValues.map((item) => (
              <li key={item.value} className="text-[12px] leading-relaxed">
                <span className="font-semibold text-zinc-800">{item.value}</span>
                <span className="text-zinc-500"> — {item.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SpecCharacteristicCard({
  label,
  value,
  deviceType,
}: {
  label: string;
  value: string;
  deviceType?: DeviceType;
}) {
  const [open, setOpen] = useState(false);
  const explain = getCharacteristicValueExplain(label, value, deviceType);

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
      {open && <CharacteristicExplainBody explain={explain} />}
    </GlassCard>
  );
}

export { CharacteristicExplainBody };
