import { authErrorResponse } from "@/lib/telegram-auth";
import { dbErrorResponse } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getAdminDashboard } from "@/lib/admin-db";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin(request);
    const dashboard = await getAdminDashboard(user.telegramId);
    return Response.json(dashboard);
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
