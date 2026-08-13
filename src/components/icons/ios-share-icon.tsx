import { cn } from "@/lib/utils";

/** Classic iOS share glyph: arrow up from an open box. */
export function IosShareIcon({
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
      <path d="M12 3.5v10.5" />
      <path d="M8.2 7.2 12 3.5l3.8 3.7" />
      <path d="M6 11.5v7.2A1.8 1.8 0 0 0 7.8 20.5h8.4a1.8 1.8 0 0 0 1.8-1.8v-7.2" />
    </svg>
  );
}
