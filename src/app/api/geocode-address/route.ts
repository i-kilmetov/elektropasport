import {
  AuthError,
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { geocodeAddressQuery } from "@/lib/nominatim-geocode";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    const body = (await request.json()) as {
      city?: string;
      address?: string;
    };

    const query = [body.city?.trim(), body.address?.trim()]
      .filter(Boolean)
      .join(", ");
    if (!query) {
      return Response.json({ error: "Укажите адрес" }, { status: 400 });
    }

    const point = await geocodeAddressQuery(query);
    if (!point) {
      return Response.json(
        { error: "Не удалось определить координаты адреса" },
        { status: 404 },
      );
    }

    return Response.json(point);
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("Geocode address error:", error);
    return Response.json(
      { error: "Ошибка геокодирования" },
      { status: 502 },
    );
  }
}
