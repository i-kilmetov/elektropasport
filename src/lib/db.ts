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
import {
  inviteeDisplayName,
  panelLimitForInvites,
  panelWord,
  type InviteEvent,
  type InviteOutcome,
  type PanelQuota,
} from "@/lib/invites";
import { buildPanelShareUrl } from "@/lib/panel-share";

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
      await sql`
        ALTER TABLE master_applications
        ADD COLUMN IF NOT EXISTS about_text TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS birth_date TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS gender TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone_digits TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS avatar_id TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS display_name TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_first_name TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS profile_last_name TEXT
      `;
      await sql`
        ALTER TABLE panels
        ADD COLUMN IF NOT EXISTS source_share_token TEXT
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS panel_shares (
          token TEXT PRIMARY KEY,
          panel_id TEXT NOT NULL,
          owner_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS panel_shares_owner_panel_idx
        ON panel_shares (owner_telegram_id, panel_id)
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS invite_token TEXT
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS users_invite_token_uidx
        ON users (invite_token)
        WHERE invite_token IS NOT NULL
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS invite_events (
          inviter_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          invitee_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          outcome TEXT NOT NULL,
          invitee_first_name TEXT,
          invitee_last_name TEXT,
          invitee_username TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (inviter_telegram_id, invitee_telegram_id)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS invite_events_inviter_created_idx
        ON invite_events (inviter_telegram_id, created_at DESC)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function randomPrefixedToken(prefix: "p" | "i"): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return `${prefix}${Array.from(bytes, (byte) => chars[byte % chars.length]).join("")}`;
}

function createShareToken(): string {
  return randomPrefixedToken("p");
}

function createInviteToken(): string {
  return randomPrefixedToken("i");
}

export async function upsertUser(
  user: ValidatedTelegramUser,
): Promise<{ isNew: boolean }> {
  const sql = getSql();
  const token = createInviteToken();
  const inserted = (await sql`
    INSERT INTO users (
      telegram_id, first_name, last_name, username, invite_token, created_at, updated_at
    )
    VALUES (
      ${user.telegramId},
      ${user.firstName ?? null},
      ${user.lastName ?? null},
      ${user.username ?? null},
      ${token},
      NOW(),
      NOW()
    )
    ON CONFLICT (telegram_id) DO NOTHING
    RETURNING telegram_id
  `) as Array<{ telegram_id: string | number }>;

  if (inserted[0]) {
    return { isNew: true };
  }

  await sql`
    UPDATE users
    SET
      first_name = ${user.firstName ?? null},
      last_name = ${user.lastName ?? null},
      username = ${user.username ?? null},
      invite_token = COALESCE(invite_token, ${token}),
      updated_at = NOW()
    WHERE telegram_id = ${user.telegramId}
  `;
  return { isNew: false };
}

export type StoredUserProfile = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phoneDigits?: string;
  avatarId?: string;
};

function splitLegacyDisplayName(value: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const full = value?.trim();
  if (!full) return {};
  const space = full.indexOf(" ");
  if (space === -1) return { firstName: full };
  return {
    firstName: full.slice(0, space).trim() || undefined,
    lastName: full.slice(space + 1).trim() || undefined,
  };
}

export async function getStoredUserProfile(
  telegramUserId: number,
): Promise<StoredUserProfile> {
  const sql = getSql();
  await ensureSchema();
  const [row] = (await sql`
    SELECT
      profile_first_name,
      profile_last_name,
      display_name,
      birth_date,
      phone_digits,
      avatar_id
    FROM users
    WHERE telegram_id = ${telegramUserId}
  `) as Array<{
    profile_first_name: string | null;
    profile_last_name: string | null;
    display_name: string | null;
    birth_date: string | null;
    phone_digits: string | null;
    avatar_id: string | null;
  }>;

  if (!row) return {};

  const legacy = splitLegacyDisplayName(row.display_name);
  const firstName =
    row.profile_first_name?.trim() || legacy.firstName || undefined;
  const lastName =
    row.profile_last_name?.trim() || legacy.lastName || undefined;

  return {
    firstName,
    lastName,
    birthDate: row.birth_date ?? undefined,
    phoneDigits: row.phone_digits ?? undefined,
    avatarId: row.avatar_id ?? undefined,
  };
}

export async function updateStoredUserProfile(
  telegramUserId: number,
  profile: StoredUserProfile,
): Promise<StoredUserProfile> {
  const sql = getSql();
  await ensureSchema();

  const firstName = profile.firstName?.trim() || null;
  const lastName = profile.lastName?.trim() || null;
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const birthDate = profile.birthDate?.trim() || null;
  const phoneDigits =
    profile.phoneDigits?.replace(/\D/g, "").slice(0, 10) || null;
  const avatarId = profile.avatarId?.trim() || null;

  await sql`
    UPDATE users
    SET
      profile_first_name = ${firstName},
      profile_last_name = ${lastName},
      display_name = ${displayName},
      birth_date = ${birthDate},
      phone_digits = ${phoneDigits},
      avatar_id = ${avatarId},
      updated_at = NOW()
    WHERE telegram_id = ${telegramUserId}
  `;

  return {
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    birthDate: birthDate ?? undefined,
    phoneDigits: phoneDigits ?? undefined,
    avatarId: avatarId ?? undefined,
  };
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
  source_share_token: string | null;
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
    sourceShareToken: row.source_share_token ?? undefined,
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
      devices, lines_count, photo_data_url, named, phases, power_kw,
      source_share_token, created_at
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
  const existing = await getPanelByOwner(telegramUserId, panel.id);
  if (!existing) {
    await assertCanAddPanel(telegramUserId);
  }
  // Do not persist huge photo data URLs — they break serverless body/DB limits.
  const devicesJson = JSON.stringify(panel.devices ?? []);
  await sql`
    INSERT INTO panels (
      id, telegram_user_id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, phases, power_kw,
      source_share_token, created_at, updated_at
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
      ${panel.sourceShareToken ?? null},
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
      source_share_token = EXCLUDED.source_share_token,
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
      devices, lines_count, photo_data_url, named, phases, power_kw,
      source_share_token, created_at
  `) as PanelRow[];
  return rows[0] ? rowToPanel(rows[0]) : null;
}

export async function getPanelByOwner(
  telegramUserId: number,
  id: string,
): Promise<PanelObject | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, phases, power_kw,
      source_share_token, created_at
    FROM panels
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    LIMIT 1
  `) as PanelRow[];
  return rows[0] ? rowToPanel(rows[0]) : null;
}

export async function createOrGetPanelShare(
  telegramUserId: number,
  panelId: string,
): Promise<string> {
  const sql = getSql();
  const existing = (await sql`
    SELECT token FROM panel_shares
    WHERE panel_id = ${panelId} AND owner_telegram_id = ${telegramUserId}
    LIMIT 1
  `) as Array<{ token: string }>;
  if (existing[0]?.token) return existing[0].token;

  const token = createShareToken();
  await sql`
    INSERT INTO panel_shares (token, panel_id, owner_telegram_id, created_at)
    VALUES (${token}, ${panelId}, ${telegramUserId}, NOW())
  `;
  return token;
}

export async function getSharedPanel(token: string): Promise<{
  panel: PanelObject;
  ownerTelegramId: number;
} | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      panels.id, panels.type, panels.title, panels.address, panels.last_check,
      panels.breakers, panels.safety, panels.devices, panels.lines_count,
      panels.photo_data_url, panels.named, panels.phases, panels.power_kw,
      panels.source_share_token, panels.created_at,
      panel_shares.owner_telegram_id
    FROM panel_shares
    JOIN panels ON panels.id = panel_shares.panel_id
      AND panels.telegram_user_id = panel_shares.owner_telegram_id
    WHERE panel_shares.token = ${token}
    LIMIT 1
  `) as Array<PanelRow & { owner_telegram_id: string | number }>;
  const row = rows[0];
  if (!row) return null;
  return {
    panel: rowToPanel(row),
    ownerTelegramId: Number(row.owner_telegram_id),
  };
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
    about?: string;
    contactMethod: "phone" | "telegram";
    phone?: string;
    name: string;
  },
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  await sql`
    INSERT INTO master_applications (
      id, telegram_user_id, city, about_text, contact_method, phone, name, created_at
    ) VALUES (
      ${payload.id},
      ${telegramUserId},
      ${payload.city},
      ${payload.about?.trim() || null},
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

async function countUserPanels(telegramUserId: number): Promise<number> {
  const sql = getSql();
  const [row] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM panels
    WHERE telegram_user_id = ${telegramUserId}
  `) as Array<{ count: number }>;
  return row?.count ?? 0;
}

async function countCreditedInvites(telegramUserId: number): Promise<number> {
  const sql = getSql();
  const [row] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM invite_events
    WHERE inviter_telegram_id = ${telegramUserId}
      AND outcome = 'credited'
  `) as Array<{ count: number }>;
  return row?.count ?? 0;
}

async function getOrCreateInviteToken(telegramUserId: number): Promise<string> {
  const sql = getSql();
  const [existing] = (await sql`
    SELECT invite_token
    FROM users
    WHERE telegram_id = ${telegramUserId}
    LIMIT 1
  `) as Array<{ invite_token: string | null }>;
  if (existing?.invite_token) return existing.invite_token;

  const token = createInviteToken();
  const [updated] = (await sql`
    UPDATE users
    SET invite_token = COALESCE(invite_token, ${token})
    WHERE telegram_id = ${telegramUserId}
    RETURNING invite_token
  `) as Array<{ invite_token: string | null }>;
  return updated?.invite_token || token;
}

async function listInviteEvents(
  telegramUserId: number,
): Promise<InviteEvent[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      outcome,
      invitee_first_name,
      invitee_last_name,
      invitee_username,
      created_at
    FROM invite_events
    WHERE inviter_telegram_id = ${telegramUserId}
    ORDER BY created_at DESC
    LIMIT 50
  `) as Array<{
    outcome: InviteOutcome;
    invitee_first_name: string | null;
    invitee_last_name: string | null;
    invitee_username: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    outcome: row.outcome === "credited" ? "credited" : "already_member",
    name: inviteeDisplayName({
      firstName: row.invitee_first_name,
      lastName: row.invitee_last_name,
      username: row.invitee_username,
    }),
    username: row.invitee_username?.replace(/^@/, "") || undefined,
    createdAt: row.created_at,
  }));
}

export async function getPanelQuota(
  telegramUserId: number,
): Promise<PanelQuota> {
  await ensureSchema();
  const [panelCount, creditedInvites, inviteToken, events] = await Promise.all([
    countUserPanels(telegramUserId),
    countCreditedInvites(telegramUserId),
    getOrCreateInviteToken(telegramUserId),
    listInviteEvents(telegramUserId),
  ]);

  const panelLimit = panelLimitForInvites(creditedInvites);
  return {
    panelCount,
    panelLimit,
    remaining: Math.max(0, panelLimit - panelCount),
    creditedInvites,
    inviteUrl: buildPanelShareUrl(inviteToken),
    events,
  };
}

async function assertCanAddPanel(telegramUserId: number): Promise<void> {
  const quota = await getPanelQuota(telegramUserId);
  if (quota.panelCount >= quota.panelLimit) {
    throw new DbError(
      `Сейчас можно хранить ${quota.panelLimit} ${panelWord(quota.panelLimit)}. Удалите один или пригласите нового пользователя.`,
      403,
      "PANEL_LIMIT",
    );
  }
}

export async function claimInvite(
  invitee: ValidatedTelegramUser,
  token: string,
  isNew: boolean,
): Promise<PanelQuota> {
  const sql = getSql();
  await ensureSchema();

  const [inviter] = (await sql`
    SELECT telegram_id
    FROM users
    WHERE invite_token = ${token}
    LIMIT 1
  `) as Array<{ telegram_id: string | number }>;

  if (inviter) {
    const inviterId = Number(inviter.telegram_id);
    if (inviterId !== invitee.telegramId) {
      const outcome: InviteOutcome = isNew ? "credited" : "already_member";
      await sql`
        INSERT INTO invite_events (
          inviter_telegram_id,
          invitee_telegram_id,
          outcome,
          invitee_first_name,
          invitee_last_name,
          invitee_username,
          created_at
        )
        VALUES (
          ${inviterId},
          ${invitee.telegramId},
          ${outcome},
          ${invitee.firstName ?? null},
          ${invitee.lastName ?? null},
          ${invitee.username ?? null},
          NOW()
        )
        ON CONFLICT (inviter_telegram_id, invitee_telegram_id) DO NOTHING
      `;
    }
  }

  return getPanelQuota(invitee.telegramId);
}

export class DbError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "DbError";
    this.status = status;
    this.code = code;
  }
}

export function dbErrorResponse(error: unknown): Response | null {
  if (error instanceof DbError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return null;
}
