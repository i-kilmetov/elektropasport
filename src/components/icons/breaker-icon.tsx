import { cn } from "@/lib/utils";

/** Стилизованная иконка модульного автомата (MCB). */
export function BreakerIcon({
  className,
  strokeWidth = 1.8,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {/* корпус автомата */}
      <rect
        x="6.5"
        y="5"
        width="11"
        height="15"
        rx="2.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      {/* рычаг */}
      <path
        d="M10 5V3.2c0-.66.54-1.2 1.2-1.2h1.6c.66 0 1.2.54 1.2 1.2V5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <rect
        x="10.2"
        y="2.1"
        width="3.6"
        height="2.2"
        rx="0.7"
        fill="currentColor"
        opacity="0.9"
      />
      {/* окно индикатора */}
      <circle cx="12" cy="9.2" r="1.15" fill="currentColor" opacity="0.85" />
      {/* клеммы / маркировка */}
      <path
        d="M9 13.2h6M9 16.2h6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M9.5 19.2h5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
