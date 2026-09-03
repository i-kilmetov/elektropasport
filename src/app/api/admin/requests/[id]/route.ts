import { authErrorResponse } from "@/lib/telegram-auth";
import { dbErrorResponse, getInstallRequestById } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import {
  adminDeleteRequest,
  adminSetRequestStatus,
} from "@/lib/admin-db";
import { installStatusLabels, type InstallRequestStatus } from "@/types";
import { notifyUserWebPush } from "@/lib/web-push";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = (await request.json()) as { status?: InstallRequestStatus };
    if (
      body.status !== "new" &&
      body.status !== "payment" &&
      body.status !== "in_progress" &&
      body.status !== "done" &&
      body.status !== "cancelled" &&
      body.status !== "deleted"
    ) {
      return Response.json({ error: "Некорректный статус" }, { status: 400 });
    }
    await adminSetRequestStatus(id, body.status, installStatusLabels[body.status]);
    const existing = await getInstallRequestById(id);
    if (existing) {
      await notifyUserWebPush(existing.telegramUserId, {
        title: "Током",
        body: `Статус заявки: ${installStatusLabels[body.status]}`,
        url: "/",
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAdmin(_request);
    const { id } = await context.params;
    await adminDeleteRequest(id);
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
