const YANDEX_GEOCODE_URL = "https://geocode-maps.yandex.ru/v1/";
const YANDEX_SEARCH_URL = "https://search-maps.yandex.ru/v1/";

const SEARCH_RADIUS_M = 1000;
/** ~1 km search box at mid-latitude (degrees). */
const SEARCH_SPN = 0.018;

export type NearbyElectricalStore = {
  id: string;
  name: string;
  address: string;
  distanceM: number;
  lat: number;
  lon: number;
  mapsUrl: string;
};

export function isYandexMapsConfigured(): boolean {
  return Boolean(process.env.YANDEX_MAPS_API_KEY?.trim());
}

function mapsApiKey(): string {
  const key = process.env.YANDEX_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error("Yandex Maps API не настроен на сервере");
  }
  return key;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusM = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}

function parseGeocodePoint(data: unknown): { lat: number; lon: number } | null {
  if (typeof data !== "object" || data === null) return null;
  const root = data as Record<string, unknown>;

  const response = root.response as Record<string, unknown> | undefined;
  const collection = response?.GeoObjectCollection as
    | Record<string, unknown>
    | undefined;
  const members = collection?.featureMember;
  if (Array.isArray(members) && members.length > 0) {
    const geoObject = (members[0] as Record<string, unknown>)?.GeoObject as
      | Record<string, unknown>
      | undefined;
    const point = geoObject?.Point as Record<string, unknown> | undefined;
    const pos = typeof point?.pos === "string" ? point.pos.trim() : "";
    const [lonRaw, latRaw] = pos.split(/\s+/);
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }
  }

  const features = root.features;
  if (Array.isArray(features) && features.length > 0) {
    const geometry = (features[0] as Record<string, unknown>)?.geometry as
      | Record<string, unknown>
      | undefined;
    const coordinates = geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const lon = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon };
      }
    }
  }

  return null;
}

export async function geocodeAddressToPoint(input: {
  city?: string;
  address?: string;
}): Promise<{ lat: number; lon: number }> {
  const city = input.city?.trim();
  const address = input.address?.trim();
  const query = [city, address].filter(Boolean).join(", ");
  if (!query) {
    throw new Error("Не указан адрес для поиска магазинов");
  }

  const url = new URL(YANDEX_GEOCODE_URL);
  url.searchParams.set("apikey", mapsApiKey());
  url.searchParams.set("geocode", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("results", "1");

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Yandex Geocoder: ${res.status}`);
  }

  const data = (await res.json()) as unknown;
  const point = parseGeocodePoint(data);
  if (!point) {
    throw new Error("Не удалось определить координаты адреса");
  }
  return point;
}

function storeMapsUrl(name: string, lat: number, lon: number): string {
  const params = new URLSearchParams({
    ll: `${lon},${lat}`,
    pt: `${lon},${lat},pm2rdm`,
    z: "17",
    text: name,
  });
  return `https://yandex.ru/maps/?${params.toString()}`;
}

function parseSearchFeatures(
  data: unknown,
  origin: { lat: number; lon: number },
): NearbyElectricalStore[] {
  if (typeof data !== "object" || data === null) return [];
  const features = (data as Record<string, unknown>).features;
  if (!Array.isArray(features)) return [];

  const stores: NearbyElectricalStore[] = [];

  for (const feature of features) {
    if (typeof feature !== "object" || feature === null) continue;
    const item = feature as Record<string, unknown>;
    const geometry = item.geometry as Record<string, unknown> | undefined;
    const coordinates = geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;

    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const distanceM = Math.round(distanceMeters(origin.lat, origin.lon, lat, lon));
    if (distanceM > SEARCH_RADIUS_M) continue;

    const properties = item.properties as Record<string, unknown> | undefined;
    const company = properties?.CompanyMetaData as
      | Record<string, unknown>
      | undefined;

    const name =
      (typeof company?.name === "string" && company.name.trim()) ||
      (typeof properties?.name === "string" && properties.name.trim()) ||
      "";
    if (!name) continue;

    const address =
      (typeof company?.address === "string" && company.address.trim()) ||
      (typeof properties?.description === "string" &&
        properties.description.trim()) ||
      "";

    const id =
      (typeof company?.id === "string" && company.id) ||
      (typeof item.id === "string" && item.id) ||
      `${lat.toFixed(5)}:${lon.toFixed(5)}:${name}`;

    stores.push({
      id,
      name,
      address,
      distanceM,
      lat,
      lon,
      mapsUrl: storeMapsUrl(name, lat, lon),
    });
  }

  return stores
    .sort((a, b) => a.distanceM - b.distanceM)
    .filter(
      (store, index, list) =>
        list.findIndex(
          (other) =>
            other.name === store.name && other.address === store.address,
        ) === index,
    )
    .slice(0, 5);
}

export async function findNearbyElectricalStores(input: {
  lat: number;
  lon: number;
}): Promise<NearbyElectricalStore[]> {
  const { lat, lon } = input;

  const url = new URL(YANDEX_SEARCH_URL);
  url.searchParams.set("apikey", mapsApiKey());
  url.searchParams.set("text", "магазин электрики");
  url.searchParams.set("type", "biz");
  url.searchParams.set("lang", "ru_RU");
  url.searchParams.set("ll", `${lon},${lat}`);
  url.searchParams.set("spn", `${SEARCH_SPN},${SEARCH_SPN}`);
  url.searchParams.set("rspn", "1");
  url.searchParams.set("results", "25");

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Yandex Search: ${res.status}${errText ? ` — ${errText.slice(0, 180)}` : ""}`,
    );
  }

  const data = (await res.json()) as unknown;
  const stores = parseSearchFeatures(data, { lat, lon });
  if (stores.length > 0) return stores;

  url.searchParams.set("text", "электротовары");
  const fallbackRes = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!fallbackRes.ok) return [];
  const fallbackData = (await fallbackRes.json()) as unknown;
  return parseSearchFeatures(fallbackData, { lat, lon });
}

export async function resolveNearbyElectricalStores(input: {
  lat?: number;
  lon?: number;
  city?: string;
  address?: string;
}): Promise<{
  stores: NearbyElectricalStore[];
  origin: { lat: number; lon: number };
}> {
  let lat = input.lat;
  let lon = input.lon;

  if (
    lat == null ||
    lon == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    const point = await geocodeAddressToPoint({
      city: input.city,
      address: input.address,
    });
    lat = point.lat;
    lon = point.lon;
  }

  const stores = await findNearbyElectricalStores({ lat, lon });
  return { stores, origin: { lat, lon } };
}
