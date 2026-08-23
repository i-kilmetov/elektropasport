"use client";

import { useState } from "react";
import { PdConsentLabel } from "@/components/ui/pd-consent-label";

export function PdConsentCheckbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  const [id] = useState(() => `pd-consent-${Math.random().toString(36).slice(2, 9)}`);

  return (
    <label
      className={
        className ??
        "flex cursor-pointer items-start gap-3 rounded-[18px] border border-black/10 bg-white/80 p-4"
      }
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 accent-zinc-800"
      />
      <PdConsentLabel id={`${id}-label`} />
    </label>
  );
}
