import { cn } from "@/lib/utils";

type IconProps = { className?: string };

const ICON_CLASS = "h-9 w-auto";

/** Apple logo silhouette (standard bitten-apple shape). */
export function AppleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 814 1000"
      aria-hidden="true"
      className={cn(ICON_CLASS, className)}
      fill="currentColor"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-163.7-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.2-57-155.5-127.4C46.8 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.6-46 28.2 0 129.9 2.6 197.1 97.2zM554.1 159.4c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.2 32.4-54.4 83.6-54.4 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.8-71.3z" />
    </svg>
  );
}

/**
 * Android robot (Google/Wikimedia official proportions, viewBox -147 -70 294 345).
 * Full body: head, torso, arms, legs, antennae.
 */
export function AndroidIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="-147 -70 294 345"
      aria-hidden="true"
      className={cn(ICON_CLASS, className)}
      fill="currentColor"
    >
      <ellipse cy="41" rx="91" ry="84" />
      <rect rx="22" height="182" width="182" y="20" x="-91" />
      <g>
        <rect
          rx="6.5"
          transform="rotate(29)"
          height="86"
          width="13"
          y="-86"
          x="14"
        />
        <rect rx="24" height="133" width="48" y="41" x="-143" />
        <rect rx="24" height="133" width="48" y="138" x="-58" />
      </g>
      <g transform="scale(-1, 1)">
        <rect
          rx="6.5"
          transform="rotate(29)"
          height="86"
          width="13"
          y="-86"
          x="14"
        />
        <rect rx="24" height="133" width="48" y="41" x="-143" />
        <rect rx="24" height="133" width="48" y="138" x="-58" />
      </g>
    </svg>
  );
}
