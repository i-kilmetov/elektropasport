import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { isMaintenanceRemindersEnabled } from "@/lib/maintenance/feature";
import {
  listMaintenanceRemindersForUser,
  upsertMaintenanceReminder,
} from "@/lib/maintenance/db";
import type { MaintenanceReminderKind } from "@/lib/maintenance/catalog";

function featureDisabledResponse() {
  return Response.json(
    { error: "Раздел «Техобслуживание» отключён" },
    { status: 404 },
  );
}

export async function GET(request: Request) {
  if (!isMaintenanceRemindersEnabled()) return featureDisabledResponse();
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const reminders = await listMaintenanceRemindersForUser(user.telegramId);
    return Response.json({ reminders });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  if (!isMaintenanceRemindersEnabled()) return featureDisabledResponse();
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as Record<string, unknown>;
    const targetKey =
      typeof body.targetKey === "string" ? body.targetKey.trim() : "";
    const kind = body.kind;
    if (!targetKey) {
      return Response.json({ error: "targetKey обязателен" }, { status: 400 });
    }
    if (kind !== "rcd_test" && kind !== "appliance_service") {
      return Response.json({ error: "Некорректный kind" }, { status: 400 });
    }

    const startDateRaw =
      body.startDate === null
        ? null
        : typeof body.startDate === "string"
          ? body.startDate.trim().slice(0, 10)
          : undefined;
    if (
      startDateRaw !== undefined &&
      startDateRaw !== null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)
    ) {
      return Response.json(
        { error: "Некорректная дата startDate" },
        { status: 400 },
      );
    }

    const intervalDays =
      body.intervalDays === null
        ? null
        : typeof body.intervalDays === "number" &&
            Number.isFinite(body.intervalDays)
          ? Math.max(1, Math.round(body.intervalDays))
          : undefined;

    const reminder = await upsertMaintenanceReminder({
      telegramUserId: user.telegramId,
      kind: kind as MaintenanceReminderKind,
      targetKey,
      panelId:
        typeof body.panelId === "string"
          ? body.panelId
          : body.panelId === null
            ? null
            : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      hidden: typeof body.hidden === "boolean" ? body.hidden : undefined,
      startDate: startDateRaw,
      intervalDays,
    });

    return Response.json({ reminder });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
