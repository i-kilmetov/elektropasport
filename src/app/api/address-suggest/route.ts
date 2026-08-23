import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";
import { MOSCOW_KLADR_ID, parseDaDataSuggestions } from "@/lib/dadata";
import {
  mapMoscowHitsToSuggestions,
  searchMoscowAddressSuggestions,
} from "@/lib/moscow-house-passport";
import { isMoscowOpenDataConfigured } from "@/lib/moscow-open-data";

const DADATA_URL =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const MAX_QUERY_LENGTH = 120;

async function suggestFromDaData(query: string, city: string) {
  const token = process.env.DADATA_API_KEY?.trim();
  if (!token) {
    return Response.json(
      { error: "Подсказки адресов не настроены" },
      { status: 503 },
    );
  }

  const locations = isMoscow(city)
    ? [{ kladr_id: MOSCOW_KLADR_ID }]
    : [{ city }];

  const res = await fetch(DADATA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      query,
      count: 20,
      locations,
      restrict_value: true,
      from_bound: { value: "street" },
      to_bound: { value: "flat" },
    }),
  });

  if (!res.ok) {
    console.error("DaData suggest failed", res.status, await res.text());
    return Response.json(
      { error: "Не удалось получить адреса" },
      { status: 502 },
    );
  }

  const payload: unknown = await res.json();
  return Response.json({
    suggestions: parseDaDataSuggestions(payload),
    source: "dadata",
  });
}

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    const body = (await request.json()) as {
      query?: string;
      city?: string;
      source?: "dadata" | "moscow";
    };
    const query = body.query?.trim() ?? "";
    const city = normalizeCityName(body.city ?? "");
    const useMoscowOpenData = isMoscow(city);

    if (query.length < 2) {
      return Response.json({
        suggestions: [],
        source: useMoscowOpenData ? "moscow" : "dadata",
      });
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return Response.json(
        { error: "Слишком длинный запрос" },
        { status: 400 },
      );
    }
    if (!city) {
      return Response.json({ error: "Укажите город" }, { status: 400 });
    }

    if (body.source === "moscow" && !useMoscowOpenData) {
      return Response.json(
        { error: "Открытые данные Москвы доступны только для города Москва" },
        { status: 400 },
      );
    }

    if (useMoscowOpenData && isMoscowOpenDataConfigured() && query.length >= 3) {
      try {
        const hits = await searchMoscowAddressSuggestions(query, 15);
        const suggestions = mapMoscowHitsToSuggestions(hits);
        if (suggestions.length > 0) {
          return Response.json({ suggestions, source: "moscow" });
        }
      } catch (error) {
        console.error("Moscow open-data address suggest failed", error);
      }
    }

    return suggestFromDaData(query, city);
  } catch (error) {
    return authErrorResponse(error);
  }
}
