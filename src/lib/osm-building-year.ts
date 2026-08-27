import {
  buildMoscowAddressKey,
  preprocessAddress,
} from "@/lib/moscow-address-match";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseOsmYear(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = /(18|19|20)\d{2}/.exec(raw);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return year >= 1800 && year <= new Date().getFullYear() + 2 ? year : null;
}

function osmAreaName(city?: string | null): string {
  const raw = (city ?? "").trim().toLowerCase().replace(/ё/g, "е");
  if (!raw || raw.includes("москв")) return "Москва";
  if (
    raw.includes("санкт") ||
    raw.includes("петербург") ||
    raw === "спб" ||
    raw.includes("питер")
  ) {
    return "Санкт-Петербург";
  }
  if (raw.includes("екатеринбург") || raw === "екб") return "Екатеринбург";
  if (raw.includes("новосибирск")) return "Новосибирск";
  if (raw.includes("казан")) return "Казань";
  if (raw.includes("нижн") && raw.includes("новгород")) {
    return "Нижний Новгород";
  }
  // Strip leading «г.» if present
  return (city ?? "Москва").replace(/^г\.?\s*/i, "").trim() || "Москва";
}

type OsmElement = {
  tags?: Record<string, string>;
};

/**
 * Building year from OpenStreetMap (works from Vercel).
 * Incomplete coverage — use as fallback after commercial/house APIs.
 * Address suggestions stay on DaData; OSM only answers «year for this street+house».
 */
export async function lookupBuildingYearFromOsm(input: {
  address: string;
  city?: string | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
}): Promise<{
  address: string;
  buildingYear: number | null;
  sourceLabel: string | null;
}> {
  const key = buildMoscowAddressKey({
    address: preprocessAddress(input.address),
    street: input.street,
    house: input.house,
    block: input.block,
  });
  if (!key) {
    return { address: input.address, buildingYear: null, sourceLabel: null };
  }

  const areaName = osmAreaName(input.city);
  const streetPattern = escapeOverpassRegex(key.street);
  const house = escapeOverpassRegex(key.house);
  const query = `[out:json][timeout:20];
area["name"="${escapeOverpassRegex(areaName)}"]["admin_level"="4"]->.a;
(
  way["addr:street"~"${streetPattern}",i]["addr:housenumber"="${house}"]["building"](area.a);
  relation["addr:street"~"${streetPattern}",i]["addr:housenumber"="${house}"]["building"](area.a);
);
out tags 8;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set("data", query);
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(22_000),
      });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) continue;
      const payload = (await res.json()) as { elements?: OsmElement[] };
      const elements = Array.isArray(payload.elements) ? payload.elements : [];

      for (const element of elements) {
        const tags = element.tags ?? {};
        const year = parseOsmYear(
          tags["building:start_date"] ?? tags.start_date,
        );
        if (year == null) continue;
        const street = tags["addr:street"]?.trim();
        const houseNumber = tags["addr:housenumber"]?.trim();
        const address =
          street && houseNumber
            ? `${street}, д. ${houseNumber}`
            : input.address;
        return {
          address,
          buildingYear: year,
          sourceLabel: "OpenStreetMap",
        };
      }
    } catch (error) {
      console.error("OSM building year lookup failed", endpoint, error);
    }
  }

  return { address: input.address, buildingYear: null, sourceLabel: null };
}
