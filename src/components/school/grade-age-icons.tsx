import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Scene({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 56 56" fill="none" aria-hidden {...props}>
      {children}
    </svg>
  );
}

/** Розетка и вилка — бытовые азы. */
export function BabyAgeIcon(props: IconProps) {
  return (
    <Scene {...props}>
      <rect width="56" height="56" rx="16" fill="#FFE566" />
      <rect x="11" y="10" width="34" height="36" rx="8" fill="#FFFDF5" />
      <rect x="13" y="12" width="30" height="32" rx="6" fill="#F4F1E8" />
      <circle cx="22.5" cy="26" r="3.4" fill="#3F3A2E" />
      <circle cx="33.5" cy="26" r="3.4" fill="#3F3A2E" />
      <path
        d="M18 33.5c.4 4.2 3.4 7 10 7s9.6-2.8 10-7"
        stroke="#3F3A2E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20.2 20.5v-3.2c0-.7.6-1.3 1.3-1.3h.8"
        stroke="#C6B44A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M35.8 20.5v-3.2c0-.7-.6-1.3-1.3-1.3h-.8"
        stroke="#C6B44A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M38.5 40.5c2.4 1.4 5.8 3.2 8 4.2"
        stroke="#111113"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="42.2" y="36.8" width="9.2" height="7.4" rx="1.8" fill="#111113" />
      <rect x="44.6" y="33.2" width="1.7" height="4.2" rx="0.6" fill="#D3DA00" />
      <rect x="47.4" y="33.2" width="1.7" height="4.2" rx="0.6" fill="#D3DA00" />
    </Scene>
  );
}

/** Щиток с автоматами — читать приборы. */
export function TeenAgeIcon(props: IconProps) {
  return (
    <Scene {...props}>
      <rect width="56" height="56" rx="16" fill="#D9E4F5" />
      <rect x="10" y="9" width="36" height="38" rx="6" fill="#4B5563" />
      <rect x="12" y="11" width="32" height="34" rx="4" fill="#EEF2F7" />
      <rect x="12" y="11" width="32" height="7" rx="4" fill="#D3DA00" />
      <rect x="12" y="15" width="32" height="4" fill="#D3DA00" />
      <rect x="15.5" y="21" width="5.6" height="18" rx="1.2" fill="#FFFFFF" stroke="#C5CDD8" />
      <rect x="17" y="23.2" width="2.6" height="6.2" rx="1.1" fill="#DC2626" />
      <rect x="22.7" y="21" width="5.6" height="18" rx="1.2" fill="#FFFFFF" stroke="#C5CDD8" />
      <rect x="24.2" y="23.2" width="2.6" height="6.2" rx="1.1" fill="#DC2626" />
      <rect x="29.9" y="21" width="5.6" height="18" rx="1.2" fill="#FFFFFF" stroke="#C5CDD8" />
      <rect x="31.4" y="32.4" width="2.6" height="6.2" rx="1.1" fill="#111113" />
      <rect x="37.1" y="21" width="5.6" height="18" rx="1.2" fill="#FFFFFF" stroke="#C5CDD8" />
      <rect x="38.6" y="23.2" width="2.6" height="6.2" rx="1.1" fill="#DC2626" />
    </Scene>
  );
}

/** Сборка на DIN-рейке — собрать щиток. */
export function AdultAgeIcon(props: IconProps) {
  return (
    <Scene {...props}>
      <rect width="56" height="56" rx="16" fill="#E4F2A6" />
      <rect x="8" y="28" width="40" height="5" rx="1.2" fill="#6B7280" />
      <rect x="11" y="18" width="10" height="18" rx="1.6" fill="#FFFFFF" />
      <rect x="11" y="18" width="10" height="18" rx="1.6" stroke="#C5CDD8" />
      <rect x="14.2" y="21" width="3.6" height="7" rx="1.2" fill="#DC2626" />
      <rect x="23" y="16" width="12" height="20" rx="1.6" fill="#FFFBE6" />
      <rect x="23" y="16" width="12" height="20" rx="1.6" stroke="#C5CDD8" />
      <rect x="27.2" y="19.2" width="3.6" height="8" rx="1.2" fill="#111113" />
      <rect x="23" y="16" width="12" height="4" fill="#D3DA00" />
      <rect x="37" y="18" width="10" height="18" rx="1.6" fill="#FFFFFF" />
      <rect x="37" y="18" width="10" height="18" rx="1.6" stroke="#C5CDD8" />
      <rect x="40.2" y="21" width="3.6" height="7" rx="1.2" fill="#2563EB" />
      <g transform="rotate(-38 40 40)">
        <rect x="33" y="34" width="18" height="4.4" rx="2.2" fill="#F59E0B" />
        <rect x="47.4" y="32.6" width="6.5" height="7.2" rx="1.4" fill="#111113" />
        <path d="M53.2 33.2 56 36.2 53.2 39.4" fill="#9CA3AF" />
      </g>
    </Scene>
  );
}
