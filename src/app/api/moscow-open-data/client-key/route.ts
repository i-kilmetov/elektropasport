import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import { isMoscowOpenDataConfigured } from "@/lib/moscow-open-data";

export const runtime = "nodejs";

/** Deliver MOS key to authenticated clients for browser-side apidata.mos.ru calls. */
export async function GET(request: Request) {
  try {
    requireTelegramUser(request);
    if (!isMoscowOpenDataConfigured()) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
    return Response.json({
      key: process.env.MOS_DATA_API_KEY?.trim() ?? "",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
