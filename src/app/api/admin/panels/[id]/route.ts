import { authErrorResponse } from "@/lib/telegram-auth";
import { dbErrorResponse } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getAdminPanel } from "@/lib/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const panel = await getAdminPanel(id);
    return Response.json({ panel });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
