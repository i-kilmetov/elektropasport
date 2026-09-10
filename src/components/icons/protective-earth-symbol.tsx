export function ProtectiveEarthSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="50"
        cy="50"
        r="42"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        d="M50 16V50M26 50H74M32 61H68M38 72H62"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="butt"
      />
    </svg>
  );
}
