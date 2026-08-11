import { sendAdminTestMessage } from "@/lib/telegram-notify";

/**
 * Sends a test Telegram message to TELEGRAM_ADMIN_CHAT_ID.
 * https://your-app.vercel.app/api/telegram/test-notify?key=YOUR_SETUP_KEY
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  const expected = process.env.TELEGRAM_SETUP_KEY?.trim();

  if (!expected || key !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendAdminTestMessage();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
