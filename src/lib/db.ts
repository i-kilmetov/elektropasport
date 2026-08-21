import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  Device,
  HomeListItem,
  InstallRequest,
  InstallRequestStatus,
  ObjectType,
  PanelObject,
  PanelWire,
} from "@/types";
import { installStatusLabels } from "@/types";
import type { ValidatedTelegramUser } from "@/lib/telegram-auth";
import {
  formatRequestPublicCode,
  type RequestTypeCode,
} from "@/lib/request-codes";
import {
  inviteeDisplayName,
  isAtPanelLimit,
  PANEL_LIMIT_MESSAGE,
  panelLimitForInvites,
  hasUnlockedPanelLimit,
  type InviteEvent,
  type InviteOutcome,
  type PanelQuota,
} from "@/lib/invites";
import { buildPanelShareUrl } from "@/lib/panel-share";

let schemaReady: Promise<void> | null = null;

/** Bump when DDL below changes so cold starts re-run migrations once. */
const SCHEMA_VERSION = "2026-08-22-a";

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

      // Fast path: skip dozens of DDL round-trips on warm / already-migrated DB.
      try {
        const [meta] = (await sql`
          SELECT value
          FROM schema_meta
          WHERE key = 'version'
          LIMIT 1
        `) as Array<{ value: string }>;
        if (meta?.value === SCHEMA_VERSION) return;
      } catch {
        // schema_meta missing — fall through to full migrate
      }

      await sql`
        CREATE TABLE IF NOT EXISTS schema_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `;
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
        ALTER TABLE panels
        ADD COLUMN IF NOT EXISTS has_ground BOOLEAN
      `;
      await sql`
        ALTER TABLE panels
        ADD COLUMN IF NOT EXISTS rail_count INT
      `;
      await sql`
        ALTER TABLE panels
        ADD COLUMN IF NOT EXISTS wires JSONB
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
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS payment_status TEXT
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS paid_amount_rub INT
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS tbank_payment_id TEXT
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS master_telegram_id BIGINT
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS panel_id TEXT
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS master_accepted_at TIMESTAMPTZ
      `;
      await sql`
        ALTER TABLE install_requests
        ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS master_feedback (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          master_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          user_reached BOOLEAN,
          master_reached BOOLEAN,
          user_score INT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS master_feedback_master_idx
        ON master_feedback (master_telegram_id)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS master_dispatch_messages (
          request_id TEXT NOT NULL,
          master_telegram_id BIGINT NOT NULL,
          chat_id BIGINT NOT NULL,
          message_id INT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (request_id, master_telegram_id)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS sbp_payments (
          id TEXT PRIMARY KEY,
          telegram_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          order_id TEXT NOT NULL UNIQUE,
          tbank_payment_id TEXT,
          service_type TEXT NOT NULL,
          amount_rub INT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          qr_payload TEXT,
          qr_image TEXT,
          lead_payload JSONB,
          request_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS sbp_payments_tbank_id_idx
        ON sbp_payments (tbank_payment_id)
      `;
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email TEXT
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS waitlist (
          id TEXT PRIMARY KEY,
          list TEXT NOT NULL,
          email TEXT NOT NULL,
          telegram_user_id BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (list, email)
        )
      `;
      await sql`
        INSERT INTO schema_meta (key, value)
        VALUES ('version', ${SCHEMA_VERSION})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
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

  // OIDC / Login Widget sometimes omit name fields — never wipe existing ones.
  await sql`
    UPDATE users
    SET
      first_name = COALESCE(${user.firstName ?? null}, first_name),
      last_name = COALESCE(${user.lastName ?? null}, last_name),
      username = COALESCE(${user.username ?? null}, username),
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
  email?: string;
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
      first_name,
      last_name,
      birth_date,
      phone_digits,
      email,
      avatar_id
    FROM users
    WHERE telegram_id = ${telegramUserId}
  `) as Array<{
    profile_first_name: string | null;
    profile_last_name: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    phone_digits: string | null;
    email: string | null;
    avatar_id: string | null;
  }>;

  if (!row) return {};

  const legacy = splitLegacyDisplayName(row.display_name);
  const firstName =
    row.profile_first_name?.trim() ||
    legacy.firstName ||
    row.first_name?.trim() ||
    undefined;
  const lastName =
    row.profile_last_name?.trim() ||
    legacy.lastName ||
    row.last_name?.trim() ||
    undefined;

  return {
    firstName,
    lastName,
    birthDate: row.birth_date ?? undefined,
    phoneDigits: row.phone_digits ?? undefined,
    email: row.email?.trim() || undefined,
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
  const email = profile.email?.trim().toLowerCase() || null;
  const avatarId = profile.avatarId?.trim() || null;

  await sql`
    UPDATE users
    SET
      profile_first_name = ${firstName},
      profile_last_name = ${lastName},
      display_name = ${displayName},
      birth_date = ${birthDate},
      phone_digits = ${phoneDigits},
      email = ${email},
      avatar_id = ${avatarId},
      updated_at = NOW()
    WHERE telegram_id = ${telegramUserId}
  `;

  return {
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    birthDate: birthDate ?? undefined,
    phoneDigits: phoneDigits ?? undefined,
    email: email ?? undefined,
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
  has_ground: boolean | null;
  rail_count: number | null;
  wires: PanelWire[] | null;
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
  payment_status: string | null;
  paid_amount_rub: number | null;
  tbank_payment_id: string | null;
  created_at: string;
  master_telegram_id?: string | number | null;
  panel_id?: string | null;
  master_accepted_at?: string | null;
  dispatched_at?: string | null;
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
    hasGround:
      row.has_ground === true
        ? true
        : row.has_ground === false
          ? false
          : undefined,
    railCount:
      typeof row.rail_count === "number" && row.rail_count > 0
        ? row.rail_count
        : undefined,
    wires: Array.isArray(row.wires) ? row.wires : undefined,
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
    paymentStatus:
      row.payment_status === "confirmed" ||
      row.payment_status === "pending" ||
      row.payment_status === "failed"
        ? row.payment_status
        : undefined,
    paidAmountRub:
      typeof row.paid_amount_rub === "number" && row.paid_amount_rub > 0
        ? row.paid_amount_rub
        : undefined,
    tbankPaymentId: row.tbank_payment_id ?? undefined,
    masterTelegramId: row.master_telegram_id ? Number(row.master_telegram_id) : undefined,
    panelId: row.panel_id ?? undefined,
    masterAcceptedAt: row.master_accepted_at ?? undefined,
    dispatchedAt: row.dispatched_at ?? undefined,
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
      has_ground, rail_count, wires, source_share_token, created_at
    FROM panels
    WHERE telegram_user_id = ${telegramUserId}
  `) as PanelRow[];

  const requests = (await sql`
    SELECT
      id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, exact_address, public_code, payment_status,
      paid_amount_rub, tbank_payment_id, created_at,
      master_telegram_id, panel_id, master_accepted_at, dispatched_at
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
  const wiresJson = JSON.stringify(panel.wires ?? []);
  await sql`
    INSERT INTO panels (
      id, telegram_user_id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, phases, power_kw,
      has_ground, rail_count, wires, source_share_token, created_at, updated_at
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
      ${panel.hasGround ?? null},
      ${panel.railCount ?? null},
      ${wiresJson}::jsonb,
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
      has_ground = EXCLUDED.has_ground,
      rail_count = EXCLUDED.rail_count,
      wires = EXCLUDED.wires,
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
      "title" | "named" | "address" | "safety" | "phases" | "powerKw" | "hasGround"
    >
  >,
): Promise<PanelObject | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE panels SET
      title = COALESCE(${patch.title ?? null}, title),
      named = COALESCE(${patch.named ?? null}, named),
      address = COALESCE(${patch.address ?? null}, address),
      safety = CASE
        WHEN ${patch.safety !== undefined} THEN ${patch.safety ?? null}
        ELSE safety
      END,
      phases = COALESCE(${patch.phases ?? null}, phases),
      power_kw = COALESCE(${patch.powerKw ?? null}, power_kw),
      has_ground = COALESCE(${patch.hasGround ?? null}, has_ground),
      updated_at = NOW()
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    RETURNING
      id, type, title, address, last_check, breakers, safety,
      devices, lines_count, photo_data_url, named, phases, power_kw,
      has_ground, rail_count, wires, source_share_token, created_at
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
      has_ground, rail_count, wires, source_share_token, created_at
    FROM panels
    WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
    LIMIT 1
  `) as PanelRow[];
  return rows[0] ? rowToPanel(rows[0]) : null;
}

export async function getPanelForMasterRequest(
  masterTelegramId: number,
  requestId: string,
): Promise<PanelObject | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      panels.id, panels.type, panels.title, panels.address, panels.last_check,
      panels.breakers, panels.safety, panels.devices, panels.lines_count,
      panels.photo_data_url, panels.named, panels.phases, panels.power_kw,
      panels.has_ground, panels.rail_count, panels.wires,
      panels.source_share_token, panels.created_at
    FROM install_requests
    JOIN panels ON panels.id = install_requests.panel_id
    WHERE install_requests.id = ${requestId}
      AND install_requests.master_telegram_id = ${masterTelegramId}
      AND install_requests.panel_id IS NOT NULL
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
      panels.has_ground, panels.rail_count, panels.wires, panels.source_share_token, panels.created_at,
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
): Promise<{ request: InstallRequest; created: boolean }> {
  const sql = getSql();
  const existing = (await sql`
    SELECT id FROM install_requests WHERE id = ${request.id} LIMIT 1
  `) as Array<{ id: string }>;
  const created = existing.length === 0;

  await sql`
    INSERT INTO install_requests (
      id, telegram_user_id, title, subtitle, status, status_label,
      created_at_label, city, contact_method, phone, name,
      dwelling, phases, power_kw, setup_title, exact_address, public_code,
      payment_status, paid_amount_rub, tbank_payment_id, panel_id, created_at
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
      ${request.exactAddress ?? null},
      ${request.publicCode ?? null},
      ${request.paymentStatus ?? null},
      ${request.paidAmountRub ?? null},
      ${request.tbankPaymentId ?? null},
      ${request.panelId ?? null},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      dwelling = COALESCE(EXCLUDED.dwelling, install_requests.dwelling),
      phases = COALESCE(EXCLUDED.phases, install_requests.phases),
      power_kw = COALESCE(EXCLUDED.power_kw, install_requests.power_kw),
      exact_address = COALESCE(EXCLUDED.exact_address, install_requests.exact_address),
      payment_status = COALESCE(EXCLUDED.payment_status, install_requests.payment_status),
      paid_amount_rub = COALESCE(EXCLUDED.paid_amount_rub, install_requests.paid_amount_rub),
      tbank_payment_id = COALESCE(EXCLUDED.tbank_payment_id, install_requests.tbank_payment_id),
      panel_id = COALESCE(EXCLUDED.panel_id, install_requests.panel_id)
  `;
  return { request, created };
}

export type SbpPaymentRecord = {
  id: string;
  telegramUserId: number;
  orderId: string;
  tbankPaymentId: string | null;
  serviceType: string;
  amountRub: number;
  status: "pending" | "confirmed" | "failed";
  qrPayload: string | null;
  qrImage: string | null;
  leadPayload: unknown;
  requestId: string | null;
};

type SbpPaymentRow = {
  id: string;
  telegram_user_id: string | number;
  order_id: string;
  tbank_payment_id: string | null;
  service_type: string;
  amount_rub: number;
  status: string;
  qr_payload: string | null;
  qr_image: string | null;
  lead_payload: unknown;
  request_id: string | null;
};

function rowToSbpPayment(row: SbpPaymentRow): SbpPaymentRecord {
  const status =
    row.status === "confirmed" || row.status === "failed"
      ? row.status
      : "pending";
  return {
    id: row.id,
    telegramUserId: Number(row.telegram_user_id),
    orderId: row.order_id,
    tbankPaymentId: row.tbank_payment_id,
    serviceType: row.service_type,
    amountRub: Number(row.amount_rub),
    status,
    qrPayload: row.qr_payload,
    qrImage: row.qr_image,
    leadPayload: row.lead_payload,
    requestId: row.request_id,
  };
}

export async function insertSbpPayment(
  payment: Omit<SbpPaymentRecord, "status"> & { status?: SbpPaymentRecord["status"] },
): Promise<SbpPaymentRecord> {
  const sql = getSql();
  const status = payment.status ?? "pending";
  await sql`
    INSERT INTO sbp_payments (
      id, telegram_user_id, order_id, tbank_payment_id, service_type,
      amount_rub, status, qr_payload, qr_image, lead_payload, request_id
    ) VALUES (
      ${payment.id},
      ${payment.telegramUserId},
      ${payment.orderId},
      ${payment.tbankPaymentId},
      ${payment.serviceType},
      ${payment.amountRub},
      ${status},
      ${payment.qrPayload},
      ${payment.qrImage},
      ${payment.leadPayload ?? null},
      ${payment.requestId}
    )
  `;
  return { ...payment, status };
}

export async function getSbpPaymentById(
  id: string,
  telegramUserId?: number,
): Promise<SbpPaymentRecord | null> {
  const sql = getSql();
  const rows = (
    telegramUserId
      ? await sql`
          SELECT * FROM sbp_payments
          WHERE id = ${id} AND telegram_user_id = ${telegramUserId}
          LIMIT 1
        `
      : await sql`
          SELECT * FROM sbp_payments WHERE id = ${id} LIMIT 1
        `
  ) as SbpPaymentRow[];
  return rows[0] ? rowToSbpPayment(rows[0]) : null;
}

export async function getSbpPaymentByTbankId(
  tbankPaymentId: string,
): Promise<SbpPaymentRecord | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM sbp_payments
    WHERE tbank_payment_id = ${tbankPaymentId}
    LIMIT 1
  `) as SbpPaymentRow[];
  return rows[0] ? rowToSbpPayment(rows[0]) : null;
}

export async function updateSbpPayment(
  id: string,
  patch: Partial<
    Pick<SbpPaymentRecord, "status" | "requestId" | "qrPayload" | "qrImage">
  >,
): Promise<SbpPaymentRecord | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE sbp_payments SET
      status = COALESCE(${patch.status ?? null}, status),
      request_id = COALESCE(${patch.requestId ?? null}, request_id),
      qr_payload = COALESCE(${patch.qrPayload ?? null}, qr_payload),
      qr_image = COALESCE(${patch.qrImage ?? null}, qr_image),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `) as SbpPaymentRow[];
  return rows[0] ? rowToSbpPayment(rows[0]) : null;
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
      setup_title, exact_address, public_code, payment_status,
      paid_amount_rub, tbank_payment_id, created_at,
      master_telegram_id, panel_id, master_accepted_at, dispatched_at
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
      setup_title, exact_address, public_code, payment_status,
      paid_amount_rub, tbank_payment_id, created_at,
      master_telegram_id, panel_id, master_accepted_at, dispatched_at
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
      setup_title, exact_address, public_code, payment_status,
      paid_amount_rub, tbank_payment_id, created_at,
      master_telegram_id, panel_id, master_accepted_at, dispatched_at
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
  usersCount: number;
  panelsCount: number;
  mastersCount: number;
}> {
  const sql = getSql();
  await ensureSchema();
  const [usersRow] = (await sql`
    SELECT COUNT(*)::int AS count FROM users
  `) as Array<{ count: number }>;
  const [panelsRow] = (await sql`
    SELECT COUNT(*)::int AS count FROM panels
  `) as Array<{ count: number }>;
  const [mastersRow] = (await sql`
    SELECT COUNT(DISTINCT telegram_user_id)::int AS count
    FROM master_applications
  `) as Array<{ count: number }>;
  return {
    usersCount: usersRow?.count ?? 0,
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

  const unlimited = hasUnlockedPanelLimit(creditedInvites);
  const panelLimit = panelLimitForInvites(creditedInvites);
  return {
    panelCount,
    panelLimit,
    remaining: unlimited
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, panelLimit - panelCount),
    unlimited,
    creditedInvites,
    inviteUrl: buildPanelShareUrl(inviteToken),
    events,
  };
}

async function assertCanAddPanel(telegramUserId: number): Promise<void> {
  const quota = await getPanelQuota(telegramUserId);
  if (isAtPanelLimit(quota)) {
    throw new DbError(PANEL_LIMIT_MESSAGE, 403, "PANEL_LIMIT");
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

/* ───── Master system ───── */

export async function getUserRole(
  telegramUserId: number,
): Promise<"user" | "master"> {
  const sql = getSql();
  await ensureSchema();
  const [row] = (await sql`
    SELECT role FROM users WHERE telegram_id = ${telegramUserId}
  `) as Array<{ role: string }>;
  return row?.role === "master" ? "master" : "user";
}

export async function setUserRole(
  telegramUserId: number,
  role: "user" | "master",
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  await sql`
    UPDATE users SET role = ${role}, updated_at = NOW()
    WHERE telegram_id = ${telegramUserId}
  `;
}

export async function listMasterTelegramIds(): Promise<number[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT telegram_id FROM users WHERE role = 'master'
  `) as Array<{ telegram_id: string | number }>;
  return rows.map((r) => Number(r.telegram_id));
}

export async function getMasterProfile(
  telegramUserId: number,
): Promise<{
  firstName: string;
  lastName: string;
  phone: string;
  username: string;
  ordersCount: number;
  rating: number;
} | null> {
  const sql = getSql();
  await ensureSchema();
  const [user] = (await sql`
    SELECT first_name, last_name, username, phone_digits
    FROM users WHERE telegram_id = ${telegramUserId} AND role = 'master'
  `) as Array<{
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    phone_digits: string | null;
  }>;
  if (!user) return null;

  const [ordersRow] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM install_requests
    WHERE master_telegram_id = ${telegramUserId}
      AND status IN ('in_progress', 'done')
  `) as Array<{ count: number }>;

  const feedbackRows = (await sql`
    SELECT user_reached, master_reached, user_score
    FROM master_feedback
    WHERE master_telegram_id = ${telegramUserId}
  `) as Array<{
    user_reached: boolean | null;
    master_reached: boolean | null;
    user_score: number | null;
  }>;

  let rating = 100;
  if (feedbackRows.length > 0) {
    let totalWeight = 0;
    let totalScore = 0;
    for (const fb of feedbackRows) {
      const bothReached = fb.user_reached === true && fb.master_reached === true;
      const reachScore = bothReached ? 100 : 0;
      totalScore += reachScore * 0.3;
      totalWeight += 0.3;
      if (bothReached && typeof fb.user_score === "number") {
        totalScore += (fb.user_score / 5) * 100 * 0.7;
        totalWeight += 0.7;
      }
    }
    rating = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 100;
  }

  return {
    firstName: user.first_name ?? "",
    lastName: user.last_name ?? "",
    phone: user.phone_digits ?? "",
    username: user.username ?? "",
    ordersCount: ordersRow?.count ?? 0,
    rating,
  };
}

export async function acceptInstallRequest(
  requestId: string,
  masterTelegramId: number,
): Promise<"accepted" | "already_taken" | "not_found"> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    UPDATE install_requests
    SET
      master_telegram_id = ${masterTelegramId},
      master_accepted_at = NOW(),
      status = 'in_progress',
      status_label = 'В работе'
    WHERE id = ${requestId}
      AND master_telegram_id IS NULL
      AND dispatched_at IS NOT NULL
    RETURNING id
  `) as Array<{ id: string }>;
  if (rows.length > 0) return "accepted";

  const [existing] = (await sql`
    SELECT master_telegram_id FROM install_requests WHERE id = ${requestId}
  `) as Array<{ master_telegram_id: string | number | null }>;
  if (!existing) return "not_found";
  if (existing.master_telegram_id) return "already_taken";
  return "not_found";
}

export async function markRequestDispatched(requestId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE install_requests
    SET dispatched_at = NOW()
    WHERE id = ${requestId} AND dispatched_at IS NULL
  `;
}

export async function saveDispatchMessage(
  requestId: string,
  masterTelegramId: number,
  chatId: number,
  messageId: number,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO master_dispatch_messages (request_id, master_telegram_id, chat_id, message_id)
    VALUES (${requestId}, ${masterTelegramId}, ${chatId}, ${messageId})
    ON CONFLICT DO NOTHING
  `;
}

export async function getDispatchMessages(
  requestId: string,
): Promise<Array<{ masterTelegramId: number; chatId: number; messageId: number }>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT master_telegram_id, chat_id, message_id
    FROM master_dispatch_messages
    WHERE request_id = ${requestId}
  `) as Array<{ master_telegram_id: string | number; chat_id: string | number; message_id: number }>;
  return rows.map((r) => ({
    masterTelegramId: Number(r.master_telegram_id),
    chatId: Number(r.chat_id),
    messageId: r.message_id,
  }));
}

export async function getRequestAcceptedMaster(
  requestId: string,
): Promise<{
  masterTelegramId: number;
  firstName: string;
  lastName: string;
  phone: string;
  username: string;
} | null> {
  const sql = getSql();
  const [row] = (await sql`
    SELECT
      u.telegram_id,
      u.first_name,
      u.last_name,
      u.phone_digits,
      u.username
    FROM install_requests ir
    JOIN users u ON u.telegram_id = ir.master_telegram_id
    WHERE ir.id = ${requestId}
      AND ir.master_telegram_id IS NOT NULL
  `) as Array<{
    telegram_id: string | number;
    first_name: string | null;
    last_name: string | null;
    phone_digits: string | null;
    username: string | null;
  }>;
  if (!row) return null;
  return {
    masterTelegramId: Number(row.telegram_id),
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    phone: row.phone_digits ?? "",
    username: row.username ?? "",
  };
}

export async function upsertMasterFeedback(
  requestId: string,
  masterTelegramId: number,
  userTelegramId: number,
  patch: {
    userReached?: boolean;
    masterReached?: boolean;
    userScore?: number;
  },
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  const id = `fb-${requestId}`;
  await sql`
    INSERT INTO master_feedback (id, request_id, master_telegram_id, user_telegram_id,
      user_reached, master_reached, user_score)
    VALUES (${id}, ${requestId}, ${masterTelegramId}, ${userTelegramId},
      ${patch.userReached ?? null}, ${patch.masterReached ?? null}, ${patch.userScore ?? null})
    ON CONFLICT (id) DO UPDATE SET
      user_reached = COALESCE(${patch.userReached ?? null}, master_feedback.user_reached),
      master_reached = COALESCE(${patch.masterReached ?? null}, master_feedback.master_reached),
      user_score = COALESCE(${patch.userScore ?? null}, master_feedback.user_score)
  `;
}

export async function listMasterRequests(
  masterTelegramId: number,
): Promise<InstallRequest[]> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT
      id, title, subtitle, status, status_label, created_at_label,
      city, contact_method, phone, name, dwelling, phases, power_kw,
      setup_title, exact_address, public_code, payment_status,
      paid_amount_rub, tbank_payment_id, created_at, panel_id
    FROM install_requests
    WHERE master_telegram_id = ${masterTelegramId}
    ORDER BY created_at DESC
  `) as Array<RequestRow & { panel_id: string | null }>;
  return rows.map((row) => ({
    ...rowToRequest(row),
    panelId: row.panel_id ?? undefined,
  }));
}

export async function setRequestPanelId(
  requestId: string,
  panelId: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE install_requests
    SET panel_id = ${panelId}
    WHERE id = ${requestId}
  `;
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
