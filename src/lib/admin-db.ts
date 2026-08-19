import { ensureSchema, getSql, DbError } from "@/lib/db";
import { ownerAdminTelegramId } from "@/lib/admin";

export type AdminPerson = {
  telegramId: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  role: "user" | "master";
  isAdmin: boolean;
  isOwner: boolean;
  createdAt: string | null;
  panelsCount: number;
};

export type AdminRequestRow = {
  id: string;
  publicCode: string;
  title: string;
  subtitle: string;
  status: string;
  statusLabel: string;
  city: string;
  name: string;
  phone: string;
  exactAddress: string;
  setupTitle: string;
  createdAt: string;
  masterTelegramId: number | null;
  masterName: string;
};

export type AdminMasterRow = {
  telegramId: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  city: string;
  about: string;
  ordersCount: number;
  isMaster: boolean;
};

export type AdminApplicationRow = {
  id: string;
  telegramId: number;
  name: string;
  city: string;
  phone: string;
  about: string;
  createdAt: string;
  isMaster: boolean;
};

export type AdminDashboardData = {
  isOwner: boolean;
  ownerTelegramId: number | null;
  stats: {
    usersCount: number;
    panelsCount: number;
    requestsCount: number;
    mastersCount: number;
    applicationsCount: number;
    byStatus: Record<string, number>;
    requestsByCity: Array<{ city: string; count: number }>;
    mastersByCity: Array<{ city: string; count: number }>;
  };
  admins: AdminPerson[];
  users: AdminPerson[];
  requests: AdminRequestRow[];
  masters: AdminMasterRow[];
  applications: AdminApplicationRow[];
};

function personName(first?: string | null, last?: string | null, fallback = "—") {
  const full = [first?.trim(), last?.trim()].filter(Boolean).join(" ");
  return full || fallback;
}

export async function getAdminDashboard(
  viewerTelegramId: number,
): Promise<AdminDashboardData> {
  const sql = getSql();
  await ensureSchema();
  const owner = ownerAdminTelegramId();

  const [
    usersCountRow,
    panelsCountRow,
    requestsCountRow,
    mastersCountRow,
    applicationsCountRow,
    statusRows,
    requestCityRows,
    masterCityRows,
    userRows,
    requestRows,
    masterRows,
    applicationRows,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM users` as unknown as Promise<Array<{ count: number }>>,
    sql`SELECT COUNT(*)::int AS count FROM panels` as unknown as Promise<Array<{ count: number }>>,
    sql`SELECT COUNT(*)::int AS count FROM install_requests` as unknown as Promise<Array<{ count: number }>>,
    sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'master'` as unknown as Promise<Array<{ count: number }>>,
    sql`SELECT COUNT(*)::int AS count FROM master_applications` as unknown as Promise<Array<{ count: number }>>,
    sql`
      SELECT status, COUNT(*)::int AS count
      FROM install_requests
      GROUP BY status
    ` as unknown as Promise<Array<{ status: string; count: number }>>,
    sql`
      SELECT COALESCE(NULLIF(TRIM(city), ''), '—') AS city, COUNT(*)::int AS count
      FROM install_requests
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 30
    ` as unknown as Promise<Array<{ city: string; count: number }>>,
    sql`
      SELECT COALESCE(NULLIF(TRIM(city), ''), '—') AS city, COUNT(DISTINCT telegram_user_id)::int AS count
      FROM master_applications
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 30
    ` as unknown as Promise<Array<{ city: string; count: number }>>,
    sql`
      SELECT
        u.telegram_id,
        u.first_name,
        u.last_name,
        u.username,
        u.phone_digits,
        u.role,
        u.is_admin,
        u.created_at,
        (SELECT COUNT(*)::int FROM panels p WHERE p.telegram_user_id = u.telegram_id) AS panels_count
      FROM users u
      ORDER BY u.created_at DESC NULLS LAST
      LIMIT 200
    ` as unknown as Promise<
      Array<{
        telegram_id: string | number;
        first_name: string | null;
        last_name: string | null;
        username: string | null;
        phone_digits: string | null;
        role: string | null;
        is_admin: boolean;
        created_at: string | null;
        panels_count: number;
      }>
    >,
    sql`
      SELECT
        ir.id, ir.public_code, ir.title, ir.subtitle, ir.status, ir.status_label,
        ir.city, ir.name, ir.phone, ir.exact_address, ir.setup_title,
        ir.created_at_label, ir.master_telegram_id,
        mu.first_name AS master_first, mu.last_name AS master_last
      FROM install_requests ir
      LEFT JOIN users mu ON mu.telegram_id = ir.master_telegram_id
      ORDER BY ir.created_at DESC
      LIMIT 200
    ` as unknown as Promise<
      Array<{
        id: string;
        public_code: string | null;
        title: string;
        subtitle: string;
        status: string;
        status_label: string;
        city: string;
        name: string;
        phone: string | null;
        exact_address: string | null;
        setup_title: string | null;
        created_at_label: string;
        master_telegram_id: string | number | null;
        master_first: string | null;
        master_last: string | null;
      }>
    >,
    sql`
      SELECT
        u.telegram_id, u.first_name, u.last_name, u.username, u.phone_digits, u.role,
        (
          SELECT ma.city FROM master_applications ma
          WHERE ma.telegram_user_id = u.telegram_id
          ORDER BY ma.created_at DESC LIMIT 1
        ) AS city,
        (
          SELECT ma.about_text FROM master_applications ma
          WHERE ma.telegram_user_id = u.telegram_id
          ORDER BY ma.created_at DESC LIMIT 1
        ) AS about,
        (
          SELECT COUNT(*)::int FROM install_requests ir
          WHERE ir.master_telegram_id = u.telegram_id
            AND ir.status IN ('in_progress', 'done')
        ) AS orders_count
      FROM users u
      WHERE u.role = 'master'
         OR EXISTS (
           SELECT 1 FROM master_applications ma WHERE ma.telegram_user_id = u.telegram_id
         )
      ORDER BY u.updated_at DESC
      LIMIT 200
    ` as unknown as Promise<
      Array<{
        telegram_id: string | number;
        first_name: string | null;
        last_name: string | null;
        username: string | null;
        phone_digits: string | null;
        role: string | null;
        city: string | null;
        about: string | null;
        orders_count: number;
      }>
    >,
    sql`
      SELECT
        ma.id, ma.telegram_user_id, ma.name, ma.city, ma.phone, ma.about_text,
        ma.created_at, u.role
      FROM master_applications ma
      LEFT JOIN users u ON u.telegram_id = ma.telegram_user_id
      ORDER BY ma.created_at DESC
      LIMIT 200
    ` as unknown as Promise<
      Array<{
        id: string;
        telegram_user_id: string | number;
        name: string;
        city: string;
        phone: string | null;
        about_text: string | null;
        created_at: string;
        role: string | null;
      }>
    >,
  ]);

  const byStatus: Record<string, number> = {
    new: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  };
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }

  const toPerson = (row: (typeof userRows)[number]): AdminPerson => {
    const telegramId = Number(row.telegram_id);
    return {
      telegramId,
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      username: row.username ?? "",
      phone: row.phone_digits ?? "",
      role: row.role === "master" ? "master" : "user",
      isAdmin: row.is_admin === true || telegramId === owner,
      isOwner: owner != null && telegramId === owner,
      createdAt: row.created_at,
      panelsCount: Number(row.panels_count ?? 0),
    };
  };

  const users = userRows.map(toPerson);
  const adminMap = new Map(users.filter((u) => u.isAdmin).map((u) => [u.telegramId, u]));
  if (owner != null && !adminMap.has(owner)) {
    adminMap.set(owner, {
      telegramId: owner,
      firstName: "Автор бота",
      lastName: "",
      username: "",
      phone: "",
      role: "user",
      isAdmin: true,
      isOwner: true,
      createdAt: null,
      panelsCount: 0,
    });
  }

  return {
    isOwner: owner != null && viewerTelegramId === owner,
    ownerTelegramId: owner,
    stats: {
      usersCount: usersCountRow[0]?.count ?? 0,
      panelsCount: panelsCountRow[0]?.count ?? 0,
      requestsCount: requestsCountRow[0]?.count ?? 0,
      mastersCount: mastersCountRow[0]?.count ?? 0,
      applicationsCount: applicationsCountRow[0]?.count ?? 0,
      byStatus,
      requestsByCity: requestCityRows,
      mastersByCity: masterCityRows,
    },
    admins: [...adminMap.values()].sort((a, b) => Number(b.isOwner) - Number(a.isOwner)),
    users,
    requests: requestRows.map((row) => ({
      id: row.id,
      publicCode: row.public_code ?? "",
      title: row.title,
      subtitle: row.subtitle,
      status: row.status,
      statusLabel: row.status_label,
      city: row.city,
      name: row.name,
      phone: row.phone ?? "",
      exactAddress: row.exact_address ?? "",
      setupTitle: row.setup_title ?? "",
      createdAt: row.created_at_label,
      masterTelegramId: row.master_telegram_id
        ? Number(row.master_telegram_id)
        : null,
      masterName: personName(row.master_first, row.master_last, "—"),
    })),
    masters: masterRows.map((row) => ({
      telegramId: Number(row.telegram_id),
      firstName: row.first_name ?? "",
      lastName: row.last_name ?? "",
      username: row.username ?? "",
      phone: row.phone_digits ?? "",
      city: row.city ?? "—",
      about: row.about ?? "",
      ordersCount: Number(row.orders_count ?? 0),
      isMaster: row.role === "master",
    })),
    applications: applicationRows.map((row) => ({
      id: row.id,
      telegramId: Number(row.telegram_user_id),
      name: row.name,
      city: row.city,
      phone: row.phone ?? "",
      about: row.about_text ?? "",
      createdAt: row.created_at,
      isMaster: row.role === "master",
    })),
  };
}

export async function setUserAdminFlag(
  telegramId: number,
  isAdmin: boolean,
): Promise<void> {
  const owner = ownerAdminTelegramId();
  if (owner != null && telegramId === owner) {
    throw new DbError("Автора бота нельзя удалить из администраторов", 400);
  }
  const sql = getSql();
  await ensureSchema();
  const [row] = (await sql`
    UPDATE users SET is_admin = ${isAdmin}, updated_at = NOW()
    WHERE telegram_id = ${telegramId}
    RETURNING telegram_id
  `) as Array<{ telegram_id: string | number }>;
  if (!row) {
    throw new DbError(
      "Пользователь не найден. Он должен хотя бы раз открыть приложение.",
      404,
    );
  }
}

export async function adminSetUserRole(
  telegramId: number,
  role: "user" | "master",
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  const [row] = (await sql`
    UPDATE users SET role = ${role}, updated_at = NOW()
    WHERE telegram_id = ${telegramId}
    RETURNING telegram_id
  `) as Array<{ telegram_id: string | number }>;
  if (!row) {
    throw new DbError("Пользователь не найден", 404);
  }
}

export async function adminSetRequestStatus(
  requestId: string,
  status: "new" | "in_progress" | "done" | "cancelled",
  statusLabel: string,
): Promise<void> {
  const sql = getSql();
  await ensureSchema();
  const [row] = (await sql`
    UPDATE install_requests
    SET status = ${status}, status_label = ${statusLabel}
    WHERE id = ${requestId}
    RETURNING id
  `) as Array<{ id: string }>;
  if (!row) throw new DbError("Заявка не найдена", 404);
}
