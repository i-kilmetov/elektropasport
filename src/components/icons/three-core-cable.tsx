export function ThreeCoreCable({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <pattern
          id="survey-pe-stripe"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="7" fill="#EAB308" />
          <rect width="3.4" height="7" fill="#15803D" />
        </pattern>
      </defs>
      <rect
        x="8"
        y="58"
        width="70"
        height="44"
        rx="22"
        fill="#D4D4D8"
        stroke="#A1A1AA"
        strokeWidth="2"
      />
      <circle
        cx="148"
        cy="80"
        r="68"
        fill="#D4D4D8"
        stroke="#A1A1AA"
        strokeWidth="2.5"
      />
      <circle cx="148" cy="80" r="58" fill="#E4E4E7" />
      <circle
        cx="104"
        cy="80"
        r="22"
        fill="#92400E"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1.2"
      />
      <circle cx="104" cy="80" r="6.5" fill="#D4D4D8" />
      <circle
        cx="148"
        cy="80"
        r="22"
        fill="url(#survey-pe-stripe)"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1.2"
      />
      <circle cx="148" cy="80" r="6.5" fill="#D4D4D8" />
      <circle
        cx="192"
        cy="80"
        r="22"
        fill="#2563EB"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1.2"
      />
      <circle cx="192" cy="80" r="6.5" fill="#D4D4D8" />
    </svg>
  );
}
