const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddressQuery(query: string): Promise<{
  lat: number;
  lon: number;
  label: string;
} | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ru");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "tokom.ru/elektropasport (master search map)",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const hit = data[0];
  if (!hit) return null;

  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    label: hit.display_name?.trim() || trimmed,
  };
}
