"use client";

import { BRAND_YELLOW, TokomTMark } from "@/components/brand-logo";
import { LOGO_INK } from "@/lib/brand-wordmark";
import { cn } from "@/lib/utils";

/** Badge for panels that finished all three safety stages. */
export function PanelVerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 ty-badge font-medium",
        className,
      )}
      style={{ backgroundColor: `${BRAND_YELLOW}55`, color: LOGO_INK }}
    >
      Проверено{" "}
      <TokomTMark fontSize="11px" color={LOGO_INK} className="translate-y-px" />
    </span>
  );
}
