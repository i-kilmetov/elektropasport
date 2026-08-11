import { cn } from "@/lib/utils";

/**
 * Фронтальный вид однополюсного автомата на DIN-рейке (как смотришь на щиток).
 */
export function BreakerIcon({
  className,
  strokeWidth = 1.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {/* корпус модуля */}
      <rect
        x="4"
        y="4.5"
        width="16"
        height="24"
        rx="1.8"
        fill="currentColor"
        opacity="0.12"
      />
      <rect
        x="4"
        y="4.5"
        width="16"
        height="24"
        rx="1.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />

      {/* верхняя клемма */}
      <rect
        x="8.2"
        y="2"
        width="7.6"
        height="3.2"
        rx="0.7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="currentColor"
        opacity="0.2"
      />
      <circle cx="12" cy="3.6" r="0.7" fill="currentColor" />

      {/* рычаг ON (фронтально, сверху корпуса) */}
      <rect
        x="8"
        y="7"
        width="8"
        height="5.5"
        rx="1.1"
        fill="currentColor"
        opacity="0.92"
      />
      <rect
        x="9.2"
        y="8"
        width="5.6"
        height="1.2"
        rx="0.4"
        fill="black"
        opacity="0.25"
      />

      {/* окно / индикатор */}
      <rect
        x="9"
        y="14"
        width="6"
        height="3.2"
        rx="0.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity="0.85"
      />
      <circle cx="12" cy="15.6" r="0.85" fill="currentColor" opacity="0.7" />

      {/* маркировка номинала */}
      <path
        d="M8.5 19.5h7M9.5 21.8h5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* нижняя клемма */}
      <rect
        x="8.2"
        y="26.5"
        width="7.6"
        height="3.2"
        rx="0.7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="currentColor"
        opacity="0.2"
      />
      <circle cx="12" cy="28.1" r="0.7" fill="currentColor" />

      {/* боковые пазы DIN-модуля */}
      <path
        d="M4 11.5h1.4M4 20.5h1.4M18.6 11.5H20M18.6 20.5H20"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
