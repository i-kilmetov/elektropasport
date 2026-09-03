import { listHomeItems } from "@/lib/db";
import { isMaintenanceRemindersEnabled } from "@/lib/maintenance/feature";
import {
  listDueMaintenanceReminders,
  markMaintenanceReminderSent,
} from "@/lib/maintenance/db";
import {
  collectApplianceServiceTargets,
  collectRcdTestTargets,
} from "@/lib/maintenance/targets";
import { sendWebPushToUser } from "@/lib/web-push";

export const maxDuration = 60;

function cronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = request.headers.get("authorization")?.trim() ?? "";
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  return request.headers.get("x-vercel-cron") === "1";
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Daily maintenance reminder pushes.
 * Kill-switch: NEXT_PUBLIC_MAINTENANCE_REMINDERS=false skips all sends.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMaintenanceRemindersEnabled()) {
    return Response.json({ ok: true, skipped: true, reason: "feature_off" });
  }

  const today = todayUtcDate();
  const due = await listDueMaintenanceReminders(today);
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of due) {
    try {
      const items = await listHomeItems(row.telegramUserId);
      const rcd = collectRcdTestTargets(items).find(
        (t) => t.targetKey === row.targetKey,
      );
      const appliance = collectApplianceServiceTargets(items).find(
        (t) => t.targetKey === row.targetKey,
      );

      let title = "Напоминание Током";
      let body = "Пора выполнить проверку или обслуживание.";

      if (row.kind === "rcd_test" && rcd) {
        title = "Проверка кнопки «Тест»";
        body = `Нажмите «Тест» на ${rcd.deviceName} в щитке «${rcd.panelTitle}».`;
      } else if (row.kind === "appliance_service" && appliance) {
        title = "Обслуживание техники";
        body = `${appliance.title}: ${appliance.hint}`;
      } else {
        skipped += 1;
        continue;
      }

      const result = await sendWebPushToUser(row.telegramUserId, {
        title,
        body,
        url: "/",
      });
      if (result.sent > 0) {
        await markMaintenanceReminderSent(row.id);
        sent += result.sent;
      } else {
        skipped += 1;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${row.id}: ${msg}`);
      console.error("maintenance cron row failed", row.id, error);
    }
  }

  return Response.json({
    ok: true,
    today,
    due: due.length,
    sent,
    skipped,
    errors: errors.slice(0, 20),
  });
}
