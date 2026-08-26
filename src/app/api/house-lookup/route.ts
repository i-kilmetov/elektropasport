import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { normalizeCityName } from "@/lib/lead-services";
import { lookupHouseInsight } from "@/lib/house-insight-lookup";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_ADDRESS_LENGTH = 200;

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    const body = (await request.json()) as {
      city?: string;
      address?: string;
      fiasId?: string;
      street?: string;
      house?: string;
      block?: string;
      buildingYear?: number;
    };

    const city = normalizeCityName(body.city ?? "");
    const address = body.address?.trim() ?? "";
    const fiasId = body.fiasId?.trim() || null;
    const street = body.street?.trim() || null;
    const house = body.house?.trim() || null;
    const block = body.block?.trim() || null;
    const buildingYear =
      typeof body.buildingYear === "number" && Number.isFinite(body.buildingYear)
        ? body.buildingYear
        : null;

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

    const insight = await lookupHouseInsight({
      city,
      address,
      fiasId,
      street,
      house,
      block,
      buildingYear,
    });

    return Response.json({ insight });
  } catch (error) {
    return authErrorResponse(error);
  }
}
