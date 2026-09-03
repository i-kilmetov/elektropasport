import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import type { MaintenanceReminderKind } from "@/lib/maintenance/catalog";

export type MaintenanceReminderDto = {
  id: string;
  kind: MaintenanceReminderKind;
  targetKey: string;
  panelId: string | null;
  enabled: boolean;
  hidden: boolean;
  startDate: string | null;
  intervalDays: number | null;
  lastSentAt: string | null;
  updatedAt: string;
};

export async function fetchMaintenanceReminders(): Promise<
  MaintenanceReminderDto[]
> {
  if (!canUseServerAuth()) return [];
  const res = await fetch("/api/maintenance/reminders", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || "Не удалось загрузить напоминания");
  }
  const data = (await res.json()) as { reminders?: MaintenanceReminderDto[] };
  return data.reminders ?? [];
}

export async function saveMaintenanceReminder(input: {
  kind: MaintenanceReminderKind;
  targetKey: string;
  panelId?: string | null;
  enabled?: boolean;
  hidden?: boolean;
  startDate?: string | null;
  intervalDays?: number | null;
}): Promise<MaintenanceReminderDto> {
  if (!canUseServerAuth()) {
    throw new Error("Войдите, чтобы сохранить напоминание");
  }
  const res = await fetch("/api/maintenance/reminders", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || "Не удалось сохранить напоминание");
  }
  const data = (await res.json()) as { reminder: MaintenanceReminderDto };
  return data.reminder;
}
