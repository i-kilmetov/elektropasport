import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";
import {
  MOSCOW_KLADR_ID,
  parseDaDataSuggestions,
  type AddressSuggestion,
} from "@/lib/dadata";
import {
  mapMoscowHitsToSuggestions,
  searchMoscowAddressSuggestions,
} from "@/lib/moscow-house-passport";
import { isMoscowOpenDataConfigured } from "@/lib/moscow-open-data";
import { lookupMoscowYearFromSeed } from "@/lib/moscow-year-seed";

const DADATA_URL =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const MAX_QUERY_LENGTH = 120;

function attachSeedYears(
  suggestions: AddressSuggestion[],
): AddressSuggestion[] {
  return suggestions.map((item) => {
    if (item.buildingYear != null) return item;
    const seed = lookupMoscowYearFromSeed({
      address: item.value,
      street: item.street,
      house: item.house,
      block: item.block,
    });
    if (!seed) return item;
    return { ...item, buildingYear: seed.buildingYear };
  });
}

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
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.error("DaData suggest failed", res.status, await res.text());
    return Response.json(
      { error: "Не удалось получить адреса" },
      { status: 502 },
    );
  }

  const payload: unknown = await res.json();
  let suggestions = parseDaDataSuggestions(payload);
  if (isMoscow(city)) {
    suggestions = attachSeedYears(suggestions);
  }
  return Response.json({
    suggestions,
    source: "dadata",
  });
}

async function suggestFromMoscowOpenData(query: string) {
  if (!isMoscowOpenDataConfigured()) {
    return null;
  }

  if (query.length < 3) {
    return [] as AddressSuggestion[];
  }

  try {
    const hits = await searchMoscowAddressSuggestions(query, 15);
    return attachSeedYears(mapMoscowHitsToSuggestions(hits));
  } catch (error) {
    console.error("Moscow open-data address suggest failed", error);
    return null;
  }
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
    const preferMoscow =
      body.source === "moscow" || (body.source !== "dadata" && isMoscow(city));

    if (query.length < 2) {
      return Response.json({
        suggestions: [],
        source: preferMoscow ? "moscow" : "dadata",
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

    if (preferMoscow && isMoscow(city)) {
      const moscowSuggestions = await suggestFromMoscowOpenData(query);
      if (moscowSuggestions && moscowSuggestions.length > 0) {
        return Response.json({
          suggestions: moscowSuggestions,
          source: "moscow",
        });
      }
      // Vercel often cannot reach apidata.mos.ru — fall back to DaData.
      return await suggestFromDaData(query, city);
    }

    return await suggestFromDaData(query, city);
  } catch (error) {
    return authErrorResponse(error);
  }
}
