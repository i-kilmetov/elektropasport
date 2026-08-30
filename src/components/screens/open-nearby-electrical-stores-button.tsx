"use client";

import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasNearbyElectricalStoresLocation,
  openNearbyElectricalStores,
} from "@/lib/yandex-maps-link";
import { cn } from "@/lib/utils";

export function OpenNearbyElectricalStoresButton({
  city,
  address,
  lat,
  lon,
  className,
  variant = "secondary",
}: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
}) {
  if (!hasNearbyElectricalStoresLocation({ city, address, lat, lon })) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("gap-2", className)}
      onClick={() => openNearbyElectricalStores({ city, address, lat, lon })}
    >
      <Store className="h-4 w-4" />
      Открыть магазины электрики рядом
    </Button>
  );
}
