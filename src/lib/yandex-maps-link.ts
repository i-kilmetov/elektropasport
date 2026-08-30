export function buildNearbyElectricalStoresUrl(input: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
}): string {
  const params = new URLSearchParams();
  const hasCoords =
    typeof input.lat === "number" &&
    typeof input.lon === "number" &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lon);

  if (hasCoords) {
    params.set("text", "магазин электрики");
    params.set("ll", `${input.lon},${input.lat}`);
    params.set("z", "16");
  } else {
    const location = [input.city?.trim(), input.address?.trim()]
      .filter(Boolean)
      .join(", ");
    params.set(
      "text",
      location ? `магазин электрики ${location}` : "магазин электрики",
    );
  }

  return `https://yandex.ru/maps/?${params.toString()}`;
}

export function openNearbyElectricalStores(input: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
}): void {
  const url = buildNearbyElectricalStoresUrl(input);
  const webApp = window.Telegram?.WebApp as
    | { openLink?: (link: string) => void }
    | undefined;
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function hasNearbyElectricalStoresLocation(input: {
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
}): boolean {
  const hasCoords =
    typeof input.lat === "number" &&
    typeof input.lon === "number" &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lon);
  return hasCoords || Boolean(input.city?.trim() || input.address?.trim());
}
