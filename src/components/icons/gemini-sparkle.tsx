import { cn } from "@/lib/utils";

/**
 * Four-point sparkle in the Gemini mark style — signals an AI assistant,
 * not a generic lightning / power icon.
 */
export function GeminiSparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-5 w-5", className)}
      aria-hidden
    >
      <path d="M12 1.6c.42 4.55 2.85 8.18 7.4 9.4-4.55 1.22-6.98 4.85-7.4 9.4-.42-4.55-2.85-8.18-7.4-9.4 4.55-1.22 6.98-4.85 7.4-9.4Z" />
      <path d="M18.55 2.35c.2 1.62.92 2.95 2.5 3.45-1.58.5-2.3 1.83-2.5 3.45-.2-1.62-.92-2.95-2.5-3.45 1.58-.5 2.3-1.83 2.5-3.45Z" />
    </svg>
  );
}
