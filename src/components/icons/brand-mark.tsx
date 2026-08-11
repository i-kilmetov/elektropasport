"use client";

import { cn } from "@/lib/utils";

const BRAND_COLORS: Record<string, string> = {
  abb: "#FF000F",
  schneider: "#3DCD58",
  systeme: "#3DCD58",
  iek: "#E30613",
  legrand: "#C8102E",
  keaz: "#0033A0",
  ekf: "#F36F21",
  chint: "#00A0E3",
  dekraft: "#1B4F9C",
  hager: "#E30613",
  zubr: "#D97706",
  meander: "#0F766E",
  novatek: "#1D4ED8",
  digitop: "#7C3AED",
};

function BrandGlyph({
  brandKey,
  brand,
}: {
  brandKey: string;
  brand?: string;
}) {
  const color = BRAND_COLORS[brandKey] ?? "#52525B";

  if (brandKey === "schneider" || brandKey === "systeme") {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
        <circle cx="8" cy="8" r="5.5" fill="none" stroke={color} strokeWidth="2" />
        <path d="M8 3.5v9M3.5 8h9" stroke={color} strokeWidth="1.8" />
      </svg>
    );
  }

  if (brandKey === "hager") {
    return (
      <svg viewBox="0 0 20 14" className="h-3.5 w-5" aria-hidden>
        <path d="M1 13V1h3.2v4h11.6V1H19v12h-3.2V8.2H4.2V13H1z" fill={color} />
      </svg>
    );
  }

  if (brandKey === "meander") {
    return (
      <svg viewBox="0 0 20 12" className="h-3 w-5" aria-hidden>
        <path
          d="M1 9c2.5-7 4.5-7 7 0s4.5 7 7 0"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const labels: Record<string, string> = {
    abb: "ABB",
    iek: "IEK",
    legrand: "Legrand",
    keaz: "KEAZ",
    ekf: "EKF",
    chint: "CHINT",
    dekraft: "DK",
    zubr: "ZUBR",
    novatek: "НТЭ",
    digitop: "DT",
  };

  const text =
    labels[brandKey] ??
    (brand ? brand.slice(0, 4).toUpperCase() : "?");

  return (
    <span
      className="text-[10px] font-extrabold leading-none tracking-tight"
      style={{ color }}
    >
      {text}
    </span>
  );
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
            : key.includes("legrand")
              ? "legrand"
              : key.includes("dekraft")
                ? "dekraft"
                : key.includes("hager")
                  ? "hager"
                  : key.includes("chint")
                    ? "chint"
                    : key.includes("keaz")
                      ? "keaz"
                      : key.includes("abb")
                        ? "abb"
                        : key.includes("iek")
                          ? "iek"
                          : key.includes("ekf")
                            ? "ekf"
                            : key.includes("zubr")
                              ? "zubr"
                              : key;

  return (
    <span
      title={brand}
      className={cn(
        "inline-flex h-5 max-w-full items-center justify-start overflow-hidden",
        className,
      )}
    >
      <BrandGlyph brandKey={normalized} brand={brand} />
    </span>
  );
}
