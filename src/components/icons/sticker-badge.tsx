import { cn } from "@/lib/utils";

/** Round sticker with a folded corner. */
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
      <path d="M8.2 4.35a8.25 8.25 0 1 0 11.45 11.45" />
      <path d="M14.55 4.2 19.8 9.45" />
      <path d="M14.55 4.2v5.25H19.8" />
    </svg>
  );
}
