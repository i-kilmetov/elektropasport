import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { normalizeCityName } from "@/lib/lead-services";
import {
  isHouseScoreConfigured,
  lookupHouseInsight,
} from "@/lib/housescore";

const MAX_ADDRESS_LENGTH = 200;

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    if (!isHouseScoreConfigured()) {
      return Response.json(
        { error: "Справка по дому временно недоступна" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      city?: string;
      address?: string;
      fiasId?: string;
    };

    const city = normalizeCityName(body.city ?? "");
    const address = body.address?.trim() ?? "";
    const fiasId = body.fiasId?.trim() || null;

    if (!city) {
      return Response.json({ error: "Укажите город" }, { status: 400 });
    }
    if (address.length < 8) {
      return Response.json(
        { error: "Укажите более точный адрес" },
        { status: 400 },
      );
    }
    if (address.length > MAX_ADDRESS_LENGTH) {
      return Response.json({ error: "Слишком длинный адрес" }, { status: 400 });
    }

    const insight = await lookupHouseInsight({ city, address, fiasId });
    return Response.json({ insight });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "HouseScore unavailable"
    ) {
      return Response.json(
        { error: "Не удалось получить данные о доме" },
        { status: 502 },
      );
    }
    return authErrorResponse(error);
  }
}
