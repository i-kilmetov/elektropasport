"use client";

import { useState } from "react";
import { applianceKindIcon } from "@/lib/home-appliances";
import type { HomeApplianceKind } from "@/types";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: {
    box: "h-8 w-8 rounded-[10px]",
    icon: "h-4 w-4",
    img: "p-1",
  },
  md: {
    box: "h-14 w-14 rounded-[16px]",
    icon: "h-7 w-7",
    img: "p-2",
  },
} as const;

export function ApplianceBrandAvatar({
  kind,
  brandLogoUrl,
  brand,
  size = "sm",
  className,
}: {
  kind: HomeApplianceKind;
  brandLogoUrl?: string | null;
  brand?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const Icon = applianceKindIcon(kind);
  const styles = sizeClasses[size];
  const showLogo = Boolean(brandLogoUrl?.trim()) && !logoFailed;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border border-black/8 bg-white text-zinc-600",
        styles.box,
        className,
      )}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandLogoUrl!.trim()}
          alt={brand ? `Логотип ${brand}` : "Логотип производителя"}
          className={cn("h-full w-full object-contain", styles.img)}
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Icon className={styles.icon} />
      )}
    </span>
  );
}
