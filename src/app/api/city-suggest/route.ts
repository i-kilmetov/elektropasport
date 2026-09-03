import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { filterCities } from "@/lib/cities";
import { parseDaDataCitySuggestions, type CitySuggestion } from "@/lib/dadata";

const DADATA_URL =
  "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";
const MAX_QUERY_LENGTH = 80;

function localCityFallback(query: string): CitySuggestion[] {
  return filterCities(query, 10).map((name) => ({ name, label: name }));
}

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    const body = (await request.json().catch(() => ({}))) as {
      query?: string;
    };
    const query = body.query?.trim() ?? "";

    if (query.length < 2) {
      return Response.json({ suggestions: [] as CitySuggestion[] });
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return Response.json(
        { error: "Слишком длинный запрос" },
        { status: 400 },
      );
    }

    const token = process.env.DADATA_API_KEY?.trim();
    if (!token) {
      return Response.json({ suggestions: localCityFallback(query) });
    }

    const res = await fetch(DADATA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        query,
        count: 12,
        from_bound: { value: "city" },
        to_bound: { value: "settlement" },
        locations: [{ country_iso_code: "RU" }],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("City suggest failed", res.status, await res.text());
      return Response.json({ suggestions: localCityFallback(query) });
    }

    const payload: unknown = await res.json();
    const suggestions = parseDaDataCitySuggestions(payload);
    return Response.json({
      suggestions:
        suggestions.length > 0 ? suggestions : localCityFallback(query),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
