import { NextResponse } from "next/server";
import { getTelegramClientId } from "@/lib/telegram-oauth";

/** Public OIDC client id for the Telegram Login JS library (not a secret). */
export async function GET() {
  const clientId = getTelegramClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Telegram Login не настроен" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { clientId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
