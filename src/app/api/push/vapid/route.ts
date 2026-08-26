import { getVapidCredentials } from "@/lib/web-push";
import { dbErrorResponse } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { publicKey } = await getVapidCredentials();
    return Response.json({ publicKey });
  } catch (error) {
    return (
      dbErrorResponse(error) ??
      Response.json({ error: "Ключи уведомлений недоступны" }, { status: 503 })
    );
  }
}
