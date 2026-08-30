"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

const DEFAULT_ZOOM = 16;
const FALLBACK_CENTER = { lat: 55.7558, lon: 37.6173 };

function MapViewport({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
  }, [center, map, zoom]);

  return null;
}

function createRadarIcon(): L.DivIcon {
  return L.divIcon({
    className: "master-search-radar-icon",
    html: `
      <div class="master-search-radar" aria-hidden="true">
        <span class="master-search-radar__ring"></span>
        <span class="master-search-radar__ring master-search-radar__ring--delay-1"></span>
        <span class="master-search-radar__ring master-search-radar__ring--delay-2"></span>
        <span class="master-search-radar__dot"></span>
      </div>
    `,
    iconSize: [160, 160],
    iconAnchor: [80, 80],
  });
}

async function resolveMapCenter(input: {
  lat?: number | null;
  lon?: number | null;
  city?: string | null;
  address?: string | null;
}): Promise<{ lat: number; lon: number }> {
  const hasCoords =
    typeof input.lat === "number" &&
    typeof input.lon === "number" &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lon);

  if (hasCoords) {
    return { lat: input.lat as number, lon: input.lon as number };
  }

  const query = [input.city?.trim(), input.address?.trim()].filter(Boolean).join(", ");
  if (query && canUseServerAuth()) {
    try {
      const res = await fetch("/api/geocode-address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          city: input.city?.trim() || undefined,
          address: input.address?.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { lat?: number; lon?: number };
        if (
          typeof data.lat === "number" &&
          typeof data.lon === "number" &&
          Number.isFinite(data.lat) &&
          Number.isFinite(data.lon)
        ) {
          return { lat: data.lat, lon: data.lon };
        }
      }
    } catch {
      // fall through to city-only or default center
    }
  }

  if (input.city?.trim() && canUseServerAuth()) {
    try {
      const res = await fetch("/api/geocode-address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ city: input.city.trim() }),
      });
      if (res.ok) {
        const data = (await res.json()) as { lat?: number; lon?: number };
        if (
          typeof data.lat === "number" &&
          typeof data.lon === "number" &&
          Number.isFinite(data.lat) &&
          Number.isFinite(data.lon)
        ) {
          return { lat: data.lat, lon: data.lon };
        }
      }
    } catch {
      // fall through
    }
  }

  return FALLBACK_CENTER;
}

export function MasterSearchMap({
  lat,
  lon,
  city,
  address,
  className,
}: {
  lat?: number | null;
  lon?: number | null;
  city?: string | null;
  address?: string | null;
  className?: string;
}) {
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    () => {
      const hasCoords =
        typeof lat === "number" &&
        typeof lon === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(lon);
      return hasCoords ? { lat, lon } : null;
    },
  );

  useEffect(() => {
    let cancelled = false;
    void resolveMapCenter({ lat, lon, city, address }).then((point) => {
      if (!cancelled) setCenter(point);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, city, address]);

  const radarIcon = useMemo(() => createRadarIcon(), []);
  const mapCenter = center ?? FALLBACK_CENTER;

  return (
    <div className={cn("master-search-map", className)}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lon]}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <MapViewport center={[mapCenter.lat, mapCenter.lon]} zoom={DEFAULT_ZOOM} />
        {center ? (
          <Marker position={[center.lat, center.lon]} icon={radarIcon} />
        ) : null}
      </MapContainer>
      <div className="master-search-map__shade" aria-hidden="true" />
    </div>
  );
}
