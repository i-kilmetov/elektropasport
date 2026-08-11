"use client";

import { cn } from "@/lib/utils";

function LogoShell({
  className,
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-white shadow-sm ring-1 ring-zinc-400/50",
        className,
      )}
    >
      {children}
    </span>
  );
}

function BrandSvg({
  brandKey,
  brand,
}: {
  brandKey: string;
  brand?: string;
}) {
  switch (brandKey) {
    case "abb":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#FF000F" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="11"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            ABB
          </text>
        </svg>
      );
    case "schneider":
    case "systeme":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#3DCD58" />
          <circle cx="16" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="2.5" />
          <path d="M16 9v14M9 16h14" stroke="#fff" strokeWidth="2" />
        </svg>
      );
    case "iek":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#E30613" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="12"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            IEK
          </text>
        </svg>
      );
    case "legrand":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#C8102E" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="9"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            LEG
          </text>
        </svg>
      );
    case "keaz":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#0033A0" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            KEAZ
          </text>
        </svg>
      );
    case "ekf":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#F36F21" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="11"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            EKF
          </text>
        </svg>
      );
    case "chint":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#00A0E3" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            CHINT
          </text>
        </svg>
      );
    case "dekraft":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#1B4F9C" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="9"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            DK
          </text>
        </svg>
      );
    case "hager":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#E30613" />
          <path d="M8 22V10h4v4.5h8V10h4v12h-4v-4.5h-8V22H8z" fill="#fff" />
        </svg>
      );
    case "zubr":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#111827" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="8"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            ZUBR
          </text>
        </svg>
      );
    case "meander":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#0F766E" />
          <path
            d="M6 20c3-8 5-8 8 0s5 8 8 0"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "novatek":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#1D4ED8" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            НТЭ
          </text>
        </svg>
      );
    case "digitop":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#7C3AED" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="9"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            DT
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
          <rect width="32" height="32" fill="#52525B" />
          <text
            x="16"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontSize="10"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            {(brand ?? "?").slice(0, 3).toUpperCase()}
          </text>
        </svg>
      );
  }
}

export function BrandMark({
  brandKey,
  brand,
  className,
}: {
  brandKey?: string;
  brand?: string;
  className?: string;
}) {
  const key = (brandKey ?? brand ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("systeme", "systeme")
    .replace("меандр", "meander")
    .replace("новатек-электро", "novatek")
    .replace("новатэк-электро", "novatek");

  const normalized =
    key.includes("schneider") || key.includes("systeme")
      ? key.includes("systeme")
        ? "systeme"
        : "schneider"
      : key.includes("meander") || key.includes("меандр")
        ? "meander"
        : key.includes("novatek") || key.includes("новатек")
          ? "novatek"
          : key.includes("digitop")
            ? "digitop"
            : key;

  return (
    <LogoShell className={className} title={brand}>
      <BrandSvg brandKey={normalized} brand={brand} />
    </LogoShell>
  );
}
