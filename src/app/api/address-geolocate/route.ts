import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { parseDaDataGeolocate } from "@/lib/dadata";

const DADATA_GEOLOCATE_URL =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address";

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    const body = (await request.json().catch(() => ({}))) as {
      lat?: unknown;
      lon?: unknown;
    };
    const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
    const lon = typeof body.lon === "number" ? body.lon : Number(body.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return Response.json(
        { error: "Некорректные координаты" },
        { status: 400 },
      );
    }

    const token = process.env.DADATA_API_KEY?.trim();
    if (!token) {
      return Response.json(
        { error: "Подсказки адресов не настроены" },
        { status: 503 },
      );
    }

    const res = await fetch(DADATA_GEOLOCATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        lat,
        lon,
        count: 1,
        radius_meters: 150,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("DaData geolocate failed", res.status, await res.text());
      return Response.json(
        { error: "Не удалось определить адрес по геопозиции" },
        { status: 502 },
      );
    }

    const payload: unknown = await res.json();
    const address = parseDaDataGeolocate(payload);
    if (!address) {
      return Response.json(
        { error: "По вашей геопозиции адрес не найден" },
        { status: 404 },
      );
    }

    return Response.json({ address });
  } catch (error) {
    return authErrorResponse(error);
  }
}
