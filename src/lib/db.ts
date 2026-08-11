import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  Device,
  HomeListItem,
  InstallRequest,
  InstallRequestStatus,
  ObjectType,
  PanelObject,
} from "@/types";
import { installStatusLabels } from "@/types";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";

let schemaReady: Promise<void> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DbError("DATABASE_URL не настроен на сервере", 503);
  }
  return neon(url);
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          telegram_id BIGINT PRIMARY KEY,
          first_name TEXT,
          last_name TEXT,
          username TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS panels (
          id TEXT PRIMARY KEY,
          telegram_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          address TEXT NOT NULL,
          last_check TEXT NOT NULL,
          breakers INT NOT NULL,
          safety INT NOT NULL,
          devices JSONB,
          lines_count INT,
          photo_data_url TEXT,
          named BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS install_requests (
          id TEXT PRIMARY KEY,
          telegram_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          subtitle TEXT NOT NULL,
          status TEXT NOT NULL,
          status_label TEXT NOT NULL,
          created_at_label TEXT NOT NULL,
          city TEXT NOT NULL,
          contact_method TEXT NOT NULL,
          phone TEXT,
          name TEXT NOT NULL,
          dwelling TEXT,
          phases TEXT,
          power_kw TEXT,
          setup_title TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS panels_user_created_idx
        ON panels (telegram_user_id, created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS install_requests_user_created_idx
        ON install_requests (telegram_user_id, created_at DESC)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function upsertUser(user: ValidatedTelegramUser): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO users (telegram_id, first_name, last_name, username, updated_at)
    VALUES (
      ${user.telegramId},
      ${user.firstName ?? null},
      ${user.lastName ?? null},
      ${user.username ?? null},
      NOW()
    )
    ON CONFLICT (telegram_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      username = EXCLUDED.username,
      updated_at = NOW()
  `;
}

type PanelRow = {
  id: string;
  type: string;
  title: string;
  address: string;
  last_check: string;
  breakers: number;
  safety: number;
  devices: Device[] | null;
  lines_count: number | null;
  photo_data_url: string | null;
  named: boolean;
  created_at: string;
};

type RequestRow = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  status_label: string;
  created_at_label: string;
  city: string;
  contact_method: string;
  phone: string | null;
  name: string;
  dwelling: string | null;
  phases: string | null;
  power_kw: string | null;
  setup_title: string | null;
  created_at: string;
};

function rowToPanel(row: PanelRow): PanelObject {
  return {
    kind: "panel",
    id: row.id,
    type: row.type as ObjectType,
    title: row.title,
    address: row.address,
    lastCheck: row.last_check,
    breakers: row.breakers,
    safety: row.safety,
    devices: row.devices ?? undefined,
    linesCount: row.lines_count ?? undefined,
    photoDataUrl: row.photo_data_url ?? undefined,
    named: row.named,
  };
}

function rowToRequest(row: RequestRow): InstallRequest {
  const status = row.status as InstallRequestStatus;
  return {
    kind: "install_request",
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    status,
    statusLabel: row.status_label || installStatusLabels[status] || row.status,
    createdAt: row.created_at_label,
    city: row.city,
    contactMethod: row.contact_method as "phone" | "telegram",
    phone: row.phone ?? undefined,
    name: row.name,
    dwelling: (row.dwelling as InstallRequest["dwelling"]) ?? undefined,
    phases: (row.phases as InstallRequest["phases"]) ?? undefined,
    powerKw: row.power_kw ?? undefined,
    setupTitle: row.setup_title ?? undefined,
  };
}

export async function listHomeItems(
  telegramUserId: number,
): Promise<HomeListItem[]> {
  const sql = getSql();
  const panels = (await sql`
    SELECT
      id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, created_at
    FROM panels
    WHERE telegram_user_id = ${telegramUserId}
  `) as PanelRow[];

  const requests = (await sql`
    SELECT
      id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, created_at
    FROM install_requests
    WHERE telegram_user_id = ${telegramUserId}
  `) as RequestRow[];

  const merged: Array<{ sort: number; item: HomeListItem }> = [
    ...panels.map((row) => ({
      sort: new Date(row.created_at).getTime(),
      item: rowToPanel(row),
    })),
    ...requests.map((row) => ({
      sort: new Date(row.created_at).getTime(),
      item: rowToRequest(row),
    })),
  ];

  merged.sort((a, b) => b.sort - a.sort);
  return merged.map((entry) => entry.item);
}

export async function insertPanel(
  telegramUserId: number,
  panel: PanelObject,
): Promise<PanelObject> {
  const sql = getSql();
  // Do not persist huge photo data URLs — they break serverless body/DB limits.
  const devicesJson = JSON.stringify(panel.devices ?? []);
  await sql`
    INSERT INTO panels (
      id, telegram_user_id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, created_at, updated_at
    ) VALUES (
      ${panel.id},
      ${telegramUserId},
      ${panel.type},
      ${panel.title},
      ${panel.address},
      ${panel.lastCheck},
      ${panel.breakers},
      ${panel.safety},
      ${devicesJson}::jsonb,
      ${panel.linesCount ?? null},
      ${null},
      ${panel.named ?? false},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      address = EXCLUDED.address,
      last_check = EXCLUDED.last_check,
      breakers = EXCLUDED.breakers,
      safety = EXCLUDED.safety,
      devices = EXCLUDED.devices,
      lines_count = EXCLUDED.lines_count,
      named = EXCLUDED.named,
      updated_at = NOW()
    WHERE panels.telegram_user_id = ${telegramUserId}
  `;
  return { ...panel, photoDataUrl: undefined };
}

export async function updatePanel(
  telegramUserId: number,
  id: string,
  patch: Partial<Pick<PanelObject, "title" | "named" | "address">>,
): Promise<PanelObject | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE panels SET
      title = COALESCE(${patch.title ?? null}, title),
      named = COALESCE(${patch.named ?? null}, named),
      address = COALESCE(${patch.address ?? null}, address),
      updated_at = NOW()
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    RETURNING
      id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, created_at
  `) as PanelRow[];
  return rows[0] ? rowToPanel(rows[0]) : null;
}

export async function deletePanel(
  telegramUserId: number,
  id: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM panels
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function insertInstallRequest(
  telegramUserId: number,
  request: InstallRequest,
): Promise<InstallRequest> {
  const sql = getSql();
  await sql`
    INSERT INTO install_requests (
      id, telegram_user_id, title, subtitle, status, status_label,
      created_at_label, city, contact_method, phone, name,
      dwelling, phases, power_kw, setup_title, created_at
    ) VALUES (
      ${request.id},
      ${telegramUserId},
      ${request.title},
      ${request.subtitle},
      ${request.status},
      ${request.statusLabel},
      ${request.createdAt},
      ${request.city},
      ${request.contactMethod},
      ${request.phone ?? null},
      ${request.name},
      ${request.dwelling ?? null},
      ${request.phases ?? null},
      ${request.powerKw ?? null},
      ${request.setupTitle ?? null},
      NOW()
    )
  `;
  return request;
}

export class DbError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "DbError";
    this.status = status;
  }
}

export function dbErrorResponse(error: unknown): Response | null {
  if (error instanceof DbError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}
