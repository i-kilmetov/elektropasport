import { ensureSchema, getSql } from "@/lib/db";
import type { MaintenanceReminderKind } from "@/lib/maintenance/catalog";
import { randomBytes } from "crypto";

export type { MaintenanceReminderKind };

export type MaintenanceReminderRow = {
  id: string;
  telegramUserId: number;
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

type Row = {
  id: string;
  telegram_user_id: string | number;
  kind: string;
  target_key: string;
  panel_id: string | null;
  enabled: boolean;
  hidden: boolean;
  start_date: string | Date | null;
  interval_days: number | null;
  last_sent_at: string | Date | null;
  updated_at: string | Date;
};

function toIsoDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

function mapRow(row: Row): MaintenanceReminderRow {
  return {
    id: row.id,
    telegramUserId: Number(row.telegram_user_id),
    kind: row.kind as MaintenanceReminderKind,
    targetKey: row.target_key,
    panelId: row.panel_id,
    enabled: Boolean(row.enabled),
    hidden: Boolean(row.hidden),
    startDate: toIsoDate(row.start_date),
    intervalDays: row.interval_days == null ? null : Number(row.interval_days),
    lastSentAt: toIso(row.last_sent_at),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function newId(): string {
  return `mr-${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
}

export async function listMaintenanceRemindersForUser(
  telegramUserId: number,
): Promise<MaintenanceReminderRow[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT *
    FROM maintenance_reminders
    WHERE telegram_user_id = ${telegramUserId}
  `) as Row[];
  return rows.map(mapRow);
}

export async function upsertMaintenanceReminder(input: {
  telegramUserId: number;
  kind: MaintenanceReminderKind;
  targetKey: string;
  panelId?: string | null;
  enabled?: boolean;
  hidden?: boolean;
  startDate?: string | null;
  intervalDays?: number | null;
}): Promise<MaintenanceReminderRow> {
  const sql = getSql();
  await ensureSchema();

  const existing = (await sql`
    SELECT *
    FROM maintenance_reminders
    WHERE telegram_user_id = ${input.telegramUserId}
      AND target_key = ${input.targetKey}
    LIMIT 1
  `) as Row[];

  if (existing[0]) {
    const prev = mapRow(existing[0]);
    const enabled = input.enabled ?? prev.enabled;
    const hidden = input.hidden ?? prev.hidden;
    const startDate =
      input.startDate === undefined ? prev.startDate : input.startDate;
    const intervalDays =
      input.intervalDays === undefined ? prev.intervalDays : input.intervalDays;
    const panelId =
      input.panelId === undefined ? prev.panelId : input.panelId;

    const rows = (await sql`
      UPDATE maintenance_reminders SET
        kind = ${input.kind},
        panel_id = ${panelId},
        enabled = ${enabled},
        hidden = ${hidden},
        start_date = ${startDate},
        interval_days = ${intervalDays},
        updated_at = NOW()
      WHERE id = ${prev.id}
      RETURNING *
    `) as Row[];
    return mapRow(rows[0]!);
  }

  const id = newId();
  const rows = (await sql`
    INSERT INTO maintenance_reminders (
      id, telegram_user_id, kind, target_key, panel_id,
      enabled, hidden, start_date, interval_days
    ) VALUES (
      ${id},
      ${input.telegramUserId},
      ${input.kind},
      ${input.targetKey},
      ${input.panelId ?? null},
      ${input.enabled ?? false},
      ${input.hidden ?? false},
      ${input.startDate ?? null},
      ${input.intervalDays ?? null}
    )
    RETURNING *
  `) as Row[];
  return mapRow(rows[0]!);
}

export async function listDueMaintenanceReminders(
  todayIsoDate: string,
): Promise<MaintenanceReminderRow[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT *
    FROM maintenance_reminders
    WHERE enabled = TRUE
      AND hidden = FALSE
      AND start_date IS NOT NULL
      AND start_date <= ${todayIsoDate}::date
  `) as Row[];
  return rows.map(mapRow).filter((row) => {
    const interval = row.intervalDays;
    if (!interval || interval <= 0) return false;
    if (!row.lastSentAt) {
      return row.startDate != null && row.startDate <= todayIsoDate;
    }
    const last = new Date(row.lastSentAt);
    const next = new Date(last);
    next.setUTCDate(next.getUTCDate() + interval);
    const nextIso = next.toISOString().slice(0, 10);
    return nextIso <= todayIsoDate;
  });
}

export async function markMaintenanceReminderSent(
  id: string,
  sentAt = new Date(),
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  await sql`
    UPDATE maintenance_reminders
    SET last_sent_at = ${sentAt.toISOString()},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function listEnabledMaintenanceUserIds(): Promise<number[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT DISTINCT telegram_user_id
    FROM maintenance_reminders
    WHERE enabled = TRUE AND hidden = FALSE
  `) as Array<{ telegram_user_id: string | number }>;
  return rows.map((row) => Number(row.telegram_user_id));
}
