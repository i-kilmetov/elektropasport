import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import {
  isMoscowOpenDataConfigured,
  probeMoscowOpenDataApi,
} from "@/lib/moscow-open-data";
import { lookupMoscowHousePassportWithDebug } from "@/lib/moscow-house-passport";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Check MOS_DATA_API_KEY and dommos lookup without exposing the key. */
export async function GET(request: Request) {
  try {
    requireTelegramUser(request);

    const configured = isMoscowOpenDataConfigured();
    const apiProbe = configured ? await probeMoscowOpenDataApi() : undefined;

    const url = new URL(request.url);
    const testAddress = url.searchParams.get("address")?.trim() ?? "";
    const testStreet = url.searchParams.get("street")?.trim() || null;
    const testHouse = url.searchParams.get("house")?.trim() || null;

    let sampleLookup:
      | Awaited<ReturnType<typeof lookupMoscowHousePassportWithDebug>>["debug"]
      | undefined;
    let samplePassport:
      | Awaited<ReturnType<typeof lookupMoscowHousePassportWithDebug>>["passport"]
      | undefined;

    if (configured && apiProbe?.ok && testAddress.length >= 8) {
      const result = await lookupMoscowHousePassportWithDebug(testAddress, {
        street: testStreet,
        house: testHouse,
      });
      sampleLookup = result.debug;
      samplePassport = result.passport;
    }

    return Response.json({
      configured,
      apiProbe,
      sampleLookup,
      samplePassport: samplePassport
        ? {
            address: samplePassport.address,
            buildingYear: samplePassport.buildingYear,
            operationYear: samplePassport.operationYear,
          }
        : null,
      hint: configured
        ? apiProbe?.ok
          ? "Ключ принят API data.mos.ru."
          : "Ключ задан, но API не отвечает — проверьте значение MOS_DATA_API_KEY и redeploy."
        : "MOS_DATA_API_KEY не задан на сервере (Vercel → Environment Variables).",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
