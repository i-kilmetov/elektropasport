"use client";

import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  iek: "IEK",
  abb: "ABB",
  schneider: "SE",
  legrand: "LEG",
  keaz: "KEAZ",
  ekf: "EKF",
  chint: "CHT",
  dekraft: "DK",
  systeme: "Sys",
  hager: "HAG",
  zubr: "ZBR",
  meander: "МНД",
  novatek: "НТЭ",
  digitop: "DT",
};

export function BrandMark({
  brandKey,
  brand,
  className,
}: {
  brandKey?: string;
  brand?: string;
  className?: string;
}) {
  const key = (brandKey ?? brand ?? "").toLowerCase().replace(/\s+/g, "");
  const label =
    LABELS[key] ??
    (brand ? brand.slice(0, 3).toUpperCase() : "—");

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[28px] items-center justify-center rounded-[4px] bg-zinc-800/80 px-1 text-[9px] font-bold tracking-wide text-zinc-100",
        className,
      )}
      title={brand}
    >
      {label}
    </span>
  );
}
