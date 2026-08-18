import { cn } from "@/lib/utils";
import type { NoPanelSetupId } from "@/lib/no-panel-setups";

function PlugFusesArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 130"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <rect x="18" y="78" width="124" height="36" rx="10" fill="#5C3A2A" />
      <rect x="18" y="78" width="124" height="12" rx="6" fill="#7A4E3A" />
      <rect x="28" y="92" width="48" height="14" rx="7" fill="#3F261C" />
      <rect x="84" y="92" width="48" height="14" rx="7" fill="#3F261C" />
      <circle cx="52" cy="99" r="9" fill="#1C120E" />
      <circle cx="108" cy="99" r="9" fill="#1C120E" />
      <circle cx="52" cy="99" r="4.2" fill="#C4A574" />
      <circle cx="108" cy="99" r="4.2" fill="#C4A574" />

      <g>
        <rect x="40" y="28" width="24" height="62" rx="8" fill="#F4E7C8" />
        <path
          d="M44 40h16M44 48h16M44 56h16M44 64h16"
          stroke="#E8D4A8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="38" y="18" width="28" height="16" rx="6" fill="#D4A017" />
        <rect x="42" y="21" width="20" height="4" rx="2" fill="#F0D36A" />
        <circle cx="52" cy="26" r="2.2" fill="#8A6A12" />
        <rect x="44" y="78" width="16" height="10" rx="3" fill="#B8893A" />
      </g>

      <g>
        <rect x="96" y="22" width="24" height="68" rx="8" fill="#F7EDD4" />
        <path
          d="M100 34h16M100 42h16M100 50h16M100 58h16M100 66h16"
          stroke="#E8D4A8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="94" y="12" width="28" height="16" rx="6" fill="#E0B01A" />
        <rect x="98" y="15" width="20" height="4" rx="2" fill="#F6DE7A" />
        <circle cx="108" cy="20" r="2.2" fill="#8A6A12" />
        <rect x="100" y="78" width="16" height="10" rx="3" fill="#B8893A" />
      </g>

      <path
        d="M24 86h8M128 86h8"
        stroke="#C4A574"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FloorPanelArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 130"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <rect x="8" y="18" width="52" height="96" rx="6" fill="#93C5FD" opacity="0.55" />
      <rect x="16" y="28" width="16" height="22" rx="2" fill="#E0F2FE" />
      <rect x="36" y="28" width="16" height="22" rx="2" fill="#E0F2FE" />
      <rect x="16" y="58" width="16" height="22" rx="2" fill="#E0F2FE" />
      <rect x="36" y="58" width="16" height="22" rx="2" fill="#E0F2FE" />
      <rect x="16" y="88" width="36" height="8" rx="2" fill="#7DD3FC" />

      <rect x="68" y="10" width="78" height="110" rx="8" fill="#334155" />
      <rect x="72" y="14" width="70" height="102" rx="6" fill="#475569" />
      <path
        d="M80 22h18M80 27h18M80 32h18"
        stroke="#94A3B8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="128" y="54" width="8" height="22" rx="3" fill="#1E293B" />
      <circle cx="132" cy="65" r="2.2" fill="#F8FAFC" />

      <path d="M142 18l10 8v88l-10 8V18Z" fill="#64748B" />
      <rect x="146" y="28" width="4" height="76" rx="1" fill="#94A3B8" opacity="0.7" />

      <rect x="84" y="40" width="48" height="62" rx="4" fill="#1E293B" />
      <rect x="88" y="46" width="10" height="22" rx="1.5" fill="#F8FAFC" />
      <rect x="101" y="46" width="10" height="22" rx="1.5" fill="#F8FAFC" />
      <rect x="114" y="46" width="10" height="22" rx="1.5" fill="#F8FAFC" />
      <rect x="89.5" y="48" width="7" height="6" rx="1" fill="#EF4444" />
      <rect x="102.5" y="48" width="7" height="6" rx="1" fill="#22C55E" />
      <rect x="115.5" y="48" width="7" height="6" rx="1" fill="#22C55E" />
      <rect x="88" y="74" width="40" height="6" rx="1.5" fill="#64748B" />
      <rect x="88" y="84" width="24" height="10" rx="2" fill="#0EA5E9" />
      <rect x="93" y="87" width="4" height="4" rx="0.6" fill="white" />
      <rect x="99" y="87" width="4" height="4" rx="0.6" fill="white" />
      <rect x="105" y="87" width="3" height="4" rx="0.6" fill="white" />
    </svg>
  );
}

function InletCableArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 130"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <rect x="10" y="14" width="86" height="102" rx="8" fill="#A8A29E" />
      <path d="M18 30h70M18 46h54M18 62h62M18 78h48" stroke="#D6D3D1" strokeWidth="3" />
      <rect x="22" y="22" width="18" height="10" rx="1" fill="#78716C" opacity="0.35" />
      <rect x="48" y="50" width="22" height="12" rx="1" fill="#78716C" opacity="0.28" />
      <rect x="28" y="86" width="16" height="14" rx="1" fill="#78716C" opacity="0.3" />

      <circle cx="96" cy="52" r="16" fill="#44403C" />
      <circle cx="96" cy="52" r="10" fill="#1C1917" />

      <path
        d="M96 52c18 4 28 18 34 38"
        stroke="#57534E"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M96 52c18 4 28 18 34 38"
        stroke="#A8A29E"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="3 5"
      />

      <path d="M128 88c6 10 10 18 12 28" stroke="#B45309" strokeWidth="5" strokeLinecap="round" />
      <path d="M132 86c10 8 16 16 20 28" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M124 90c2 12 2 20 4 28"
        stroke="#CA8A04"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M122 96c1 8 2 14 3 22"
        stroke="#166534"
        strokeWidth="1.4"
        strokeDasharray="3 2"
      />
      <circle cx="140" cy="116" r="2.4" fill="#D97706" />
      <circle cx="152" cy="114" r="2.4" fill="#1D4ED8" />
      <circle cx="128" cy="118" r="2.4" fill="#CA8A04" />
    </svg>
  );
}

function OtherArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 130"
      fill="none"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <rect x="18" y="78" width="28" height="22" rx="4" fill="#C4B5FD" opacity="0.7" />
      <rect x="24" y="70" width="8" height="16" rx="2" fill="#A78BFA" />
      <path
        d="M118 24c12 6 22 4 28 14"
        stroke="#DDD6FE"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M22 36c10-8 22-4 28 6"
        stroke="#F0ABFC"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="118" y="86" width="22" height="18" rx="4" fill="#E9D5FF" />
      <circle cx="129" cy="95" r="4" fill="#A855F7" />

      <circle cx="80" cy="62" r="36" fill="#7C3AED" />
      <circle cx="80" cy="62" r="28" fill="#F5F3FF" />
      <path
        d="M68 52c0-8 7-14 16-14s16 6 16 14c0 7-6 11-12 14-4 2-6 5-6 9"
        stroke="#6D28D9"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="82" cy="86" r="5" fill="#6D28D9" />
    </svg>
  );
}

const ART: Record<
  NoPanelSetupId,
  { title: string; bg: string; Art: typeof PlugFusesArt }
> = {
  plug_fuses: {
    title: "Пробки",
    bg: "bg-amber-50 text-amber-950",
    Art: PlugFusesArt,
  },
  floor_panel_only: {
    title: "Только этажный щит",
    bg: "bg-sky-50 text-slate-900",
    Art: FloorPanelArt,
  },
  inlet_cable: {
    title: "Только вводной кабель",
    bg: "bg-emerald-50 text-emerald-950",
    Art: InletCableArt,
  },
  other: {
    title: "Другое",
    bg: "bg-violet-50 text-violet-950",
    Art: OtherArt,
  },
};

export function NoPanelSetupArt({
  id,
  className,
}: {
  id: NoPanelSetupId;
  className?: string;
}) {
  const { Art } = ART[id];
  return <Art className={className} />;
}

export function noPanelCardVisual(id: NoPanelSetupId) {
  return ART[id];
}
