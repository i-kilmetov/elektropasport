import {
  AuthError,
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  isYandexMapsConfigured,
  resolveNearbyElectricalStores,
} from "@/lib/yandex-maps";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    if (!isYandexMapsConfigured()) {
      return Response.json(
        { error: "Поиск магазинов не настроен", stores: [] },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      lat?: unknown;
      lon?: unknown;
      city?: string;
      address?: string;
    };

    const lat =
      typeof body.lat === "number"
        ? body.lat
        : body.lat != null
          ? Number(body.lat)
          : undefined;
    const lon =
      typeof body.lon === "number"
        ? body.lon
        : body.lon != null
          ? Number(body.lon)
          : undefined;

    const city = body.city?.trim();
    const address = body.address?.trim();

    const hasCoords =
      lat != null &&
      lon != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lon);
    if (!hasCoords && !city && !address) {
      return Response.json(
        { error: "Укажите адрес или координаты" },
        { status: 400 },
      );
    }

    const result = await resolveNearbyElectricalStores({
      lat: hasCoords ? lat : undefined,
      lon: hasCoords ? lon : undefined,
      city,
      address,
    });

    return Response.json({
      stores: result.stores,
      origin: result.origin,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("Nearby electrical stores error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось найти магазины рядом",
        stores: [],
      },
      { status: 502 },
    );
  }
}
