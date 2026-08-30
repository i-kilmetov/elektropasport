"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, MapPin, Store } from "lucide-react";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import type { NearbyElectricalStore } from "@/lib/yandex-maps";

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} м`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} км`;
}

export function NearbyElectricalStoresPanel({
  city,
  address,
  lat,
  lon,
}: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
}) {
  const [stores, setStores] = useState<NearbyElectricalStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!canUseServerAuth()) {
      setLoading(false);
      setHidden(true);
      return;
    }

    const hasCoords =
      typeof lat === "number" &&
      typeof lon === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lon);
    const hasAddress = Boolean(city?.trim() || address?.trim());
    if (!hasCoords && !hasAddress) {
      setLoading(false);
      setHidden(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setHidden(false);

    void (async () => {
      try {
        const res = await fetch("/api/nearby/electrical-stores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            lat: hasCoords ? lat : undefined,
            lon: hasCoords ? lon : undefined,
            city: city?.trim() || undefined,
            address: address?.trim() || undefined,
          }),
        });

        const data = (await res.json()) as {
          stores?: NearbyElectricalStore[];
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok || !Array.isArray(data.stores) || data.stores.length === 0) {
          setStores([]);
          setHidden(true);
          return;
        }

        setStores(data.stores);
      } catch {
        if (!cancelled) {
          setStores([]);
          setHidden(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city, address, lat, lon]);

  if (hidden && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.28 }}
      className="shrink-0 border-t border-black/8 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Store className="h-4 w-4" />
        </div>
        <div>
          <h3 className="ty-label text-zinc-900">
            Магазины электрики рядом
          </h3>
          <p className="ty-meta">В радиусе до 1 км от вашего адреса</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-[18px] bg-zinc-100"
            />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {stores.map((store) => (
            <li key={store.id}>
              <a
                href={store.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-[18px] border border-black/8 bg-zinc-50 px-3.5 py-3 transition-colors hover:bg-zinc-100"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="ty-label text-zinc-900">{store.name}</span>
                    <span className="shrink-0 ty-meta tabular-nums">
                      {formatDistance(store.distanceM)}
                    </span>
                  </span>
                  {store.address ? (
                    <span className="mt-1 block ty-meta">{store.address}</span>
                  ) : null}
                </span>
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
