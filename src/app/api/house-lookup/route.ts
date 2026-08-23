import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";
import {
  buildLocalHouseInsight,
  lookupHouseInsight,
} from "@/lib/house-insight-lookup";
import { isMoscowOpenDataConfigured } from "@/lib/moscow-open-data";

const MAX_ADDRESS_LENGTH = 200;

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

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

    if (isMoscow(city) && !isMoscowOpenDataConfigured()) {
      return Response.json({
        insight: buildLocalHouseInsight({ city, address, fiasId }),
      });
    }

    const insight = await lookupHouseInsight({ city, address, fiasId });
    return Response.json({ insight });
  } catch (error) {
    return authErrorResponse(error);
  }
}
