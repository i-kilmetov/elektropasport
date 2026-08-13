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
import {
  formatRequestPublicCode,
  type RequestTypeCode,
} from "@/lib/request-codes";

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
          safety INT,
          devices JSONB,
          lines_count INT,
          photo_data_url TEXT,
          named BOOLEAN NOT NULL DEFAULT FALSE,
          phases TEXT,
          power_kw TEXT,
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
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS exact_address TEXT
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS public_code TEXT
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS request_code_counters (
          type_code TEXT PRIMARY KEY,
          last_number INT NOT NULL DEFAULT 0
        )
      `;
      await sql`
        ALTER TABLE panels
        ADD COLUMN IF NOT EXISTS phases TEXT
      `;
      await sql`
        ALTER TABLE panels
        ADD COLUMN IF NOT EXISTS power_kw TEXT
      `;
      await sql`
        ALTER TABLE panels
        ALTER COLUMN safety DROP NOT NULL
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS master_applications (
          id TEXT PRIMARY KEY,
          telegram_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          city TEXT NOT NULL,
          contact_method TEXT NOT NULL,
          phone TEXT,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
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
  safety: number | null;
  devices: Device[] | null;
  lines_count: number | null;
  photo_data_url: string | null;
  named: boolean;
  phases: string | null;
  power_kw: string | null;
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
  exact_address: string | null;
  public_code: string | null;
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
    phases:
      row.phases === "1" || row.phases === "3" ? row.phases : undefined,
    powerKw: row.power_kw ?? undefined,
  };
}

function rowToRequest(row: RequestRow): InstallRequest {
  const rawStatus = row.status;
  const status: InstallRequestStatus =
    rawStatus === "in_progress" ||
    rawStatus === "done" ||
    rawStatus === "cancelled" ||
    rawStatus === "new"
      ? rawStatus
      : "new";

  return {
    kind: "install_request",
    id: row.id,
    title: row.title,
    subtitle:
      row.subtitle === "На установку щитка"
        ? "Заявка на установку щитка"
        : row.subtitle,
    status,
    statusLabel: installStatusLabels[status],
    createdAt: row.created_at_label,
    city: row.city,
    contactMethod: row.contact_method as "phone" | "telegram",
    phone: row.phone ?? undefined,
    name: row.name,
    dwelling: (row.dwelling as InstallRequest["dwelling"]) ?? undefined,
    phases: (row.phases as InstallRequest["phases"]) ?? undefined,
    powerKw: row.power_kw ?? undefined,
    setupTitle: row.setup_title ?? undefined,
    exactAddress: row.exact_address ?? undefined,
    publicCode: row.public_code ?? undefined,
  };
}

export async function listHomeItems(
  telegramUserId: number,
): Promise<HomeListItem[]> {
  const sql = getSql();
  const panels = (await sql`
    SELECT
      id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, phases, power_kw, created_at
    FROM panels
    WHERE telegram_user_id = ${telegramUserId}
  `) as PanelRow[];

  const requests = (await sql`
    SELECT
      id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, exact_address, public_code, created_at
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
      devices, lines_count, photo_data_url, named, phases, power_kw,
      created_at, updated_at
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
      ${panel.phases ?? null},
      ${panel.powerKw ?? null},
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
      phases = EXCLUDED.phases,
      power_kw = EXCLUDED.power_kw,
      updated_at = NOW()
    WHERE panels.telegram_user_id = ${telegramUserId}
  `;
  return { ...panel, photoDataUrl: undefined };
}

export async function updatePanel(
  telegramUserId: number,
  id: string,
  patch: Partial<
    Pick<
      PanelObject,
      "title" | "named" | "address" | "safety" | "phases" | "powerKw"
    >
  >,
): Promise<PanelObject | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE panels SET
      title = COALESCE(${patch.title ?? null}, title),
      named = COALESCE(${patch.named ?? null}, named),
      address = COALESCE(${patch.address ?? null}, address),
      safety = COALESCE(${patch.safety ?? null}, safety),
      phases = COALESCE(${patch.phases ?? null}, phases),
      power_kw = COALESCE(${patch.powerKw ?? null}, power_kw),
      updated_at = NOW()
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    RETURNING
      id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, phases, power_kw, created_at
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

export async function allocateRequestPublicCode(
  typeCode: RequestTypeCode,
): Promise<string> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO request_code_counters (type_code, last_number)
    VALUES (${typeCode}, 1)
    ON CONFLICT (type_code) DO UPDATE
    SET last_number = request_code_counters.last_number + 1
    RETURNING last_number
  `) as Array<{ last_number: number }>;
  const sequence = Number(rows[0]?.last_number ?? 1);
  return formatRequestPublicCode(typeCode, sequence);
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
      dwelling, phases, power_kw, setup_title, public_code, created_at
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
      ${request.publicCode ?? null},
      NOW()
    )
  `;
  return request;
}

export async function updateInstallRequest(
  telegramUserId: number,
  id: string,
  patch: Partial<
    Pick<InstallRequest, "title" | "status" | "statusLabel" | "exactAddress">
  >,
): Promise<InstallRequest | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE install_requests SET
      title = COALESCE(${patch.title ?? null}, title),
      status = COALESCE(${patch.status ?? null}, status),
      status_label = COALESCE(${patch.statusLabel ?? null}, status_label),
      exact_address = COALESCE(${patch.exactAddress ?? null}, exact_address)
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    RETURNING
      id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, exact_address, public_code, created_at
  `) as RequestRow[];
  return rows[0] ? rowToRequest(rows[0]) : null;
}

export async function getInstallRequestById(
  id: string,
): Promise<(InstallRequest & { telegramUserId: number }) | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id, telegram_user_id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, exact_address, public_code, created_at
    FROM install_requests
    WHERE id = ${id}
    LIMIT 1
  `) as Array<RequestRow & { telegram_user_id: string | number }>;

  const row = rows[0];
  if (!row) return null;
  return {
    ...rowToRequest(row),
    telegramUserId: Number(row.telegram_user_id),
  };
}

export async function adminUpdateInstallRequest(
  id: string,
  patch: Partial<
    Pick<InstallRequest, "title" | "status" | "statusLabel" | "exactAddress">
  >,
): Promise<InstallRequest | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE install_requests SET
      title = COALESCE(${patch.title ?? null}, title),
      status = COALESCE(${patch.status ?? null}, status),
      status_label = COALESCE(${patch.statusLabel ?? null}, status_label),
      exact_address = COALESCE(${patch.exactAddress ?? null}, exact_address)
    WHERE id = ${id}
    RETURNING
      id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, exact_address, public_code, created_at
  `) as RequestRow[];
  return rows[0] ? rowToRequest(rows[0]) : null;
}

export async function deleteInstallRequest(
  telegramUserId: number,
  id: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM install_requests
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function insertMasterApplication(
  telegramUserId: number,
  payload: {
    id: string;
    city: string;
    contactMethod: "phone" | "telegram";
    phone?: string;
    name: string;
  },
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  await sql`
    INSERT INTO master_applications (
      id, telegram_user_id, city, contact_method, phone, name, created_at
    ) VALUES (
      ${payload.id},
      ${telegramUserId},
      ${payload.city},
      ${payload.contactMethod},
      ${payload.phone ?? null},
      ${payload.name},
      NOW()
    )
  `;
}

export async function getPublicStats(): Promise<{
  panelsCount: number;
  mastersCount: number;
}> {
  const sql = getSql();
  await ensureSchema();
  const [panelsRow] = (await sql`
    SELECT COUNT(*)::int AS count FROM panels
  `) as Array<{ count: number }>;
  const [mastersRow] = (await sql`
    SELECT COUNT(DISTINCT telegram_user_id)::int AS count
    FROM master_applications
  `) as Array<{ count: number }>;
  return {
    panelsCount: panelsRow?.count ?? 0,
    mastersCount: mastersRow?.count ?? 0,
  };
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
