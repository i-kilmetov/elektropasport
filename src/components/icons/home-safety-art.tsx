import { cn } from "@/lib/utils";

/** Compact promo illustration for the home safety banner. */
export function HomeSafetyArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <circle cx="48" cy="48" r="46" fill="#E8F6EE" />
      <circle cx="72" cy="22" r="10" fill="#D7F0E2" />
      <rect x="22" y="38" width="52" height="38" rx="8" fill="#111113" />
      <path
        d="M18 42.5 48 22l30 20.5"
        stroke="#111113"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x="42" y="54" width="12" height="22" rx="3" fill="#FAFAFA" />
      <circle cx="70" cy="68" r="14" fill="#16A34A" />
      <path
        d="M64.5 68.2 68.2 72l7.4-8.2"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
