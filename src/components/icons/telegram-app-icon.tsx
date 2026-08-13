import { cn } from "@/lib/utils";

/** Paper-plane mark of the Telegram app icon. */
export function TelegramAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M20.67 3.72 3.44 10.37c-1.17.47-1.16 2.12.02 2.56l3.9 1.47 1.48 4.8c.32 1.03 1.64 1.33 2.35.53l2.14-2.39 4.16 3.12c.87.66 2.14.18 2.4-.91l3.3-13.01c.29-1.14-.64-2.16-1.83-1.82Zm-3.2 4.55-7.7 6.64-.12 2.96-.98-3.18 8.8-6.42Z" />
    </svg>
  );
}
