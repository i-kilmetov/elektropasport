import { cn } from "@/lib/utils";

/** Peel-off rectangular sticker / наклейка. */
export function StickerBadgeIcon({
  className,
  strokeWidth = 1.75,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden
    >
      <path d="M7 3.75h7.15L19.25 8.85V19.5A1.75 1.75 0 0 1 17.5 21.25h-10.5A1.75 1.75 0 0 1 5.25 19.5v-14A1.75 1.75 0 0 1 7 3.75Z" />
      <path d="M14.15 3.75V8.1h4.35" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.25h4.5" />
    </svg>
  );
}
