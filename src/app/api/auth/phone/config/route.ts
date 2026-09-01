import { isBrowserLoginEnabled } from "@/lib/phone-auth";

export async function GET() {
  return Response.json({ enabled: isBrowserLoginEnabled() });
}
