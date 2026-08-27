import { cityMatchKey, isMoscow } from "@/lib/lead-services";
import { getSql } from "@/lib/sql-client";

/** Admin Telegram id used as a connected Moscow master for service checks. */
export const CONNECTED_MASTER_TELEGRAM_ID = 602379;

function applicationId(telegramId: number): string {
  return `connected-moscow-master-${telegramId}`;
}

export async function ensureConnectedMoscowMaster(): Promise<void> {
  const sql = getSql();
  const ids = [
    CONNECTED_MASTER_TELEGRAM_ID,
    -CONNECTED_MASTER_TELEGRAM_ID,
  ];

  for (const telegramId of ids) {
    await sql`
      INSERT INTO users (telegram_id, first_name, role, updated_at)
      VALUES (${telegramId}, 'Admin', 'master', NOW())
      ON CONFLICT (telegram_id) DO UPDATE
      SET role = 'master', updated_at = NOW()
    `;

    const [latest] = (await sql`
      SELECT city
      FROM master_applications
      WHERE telegram_user_id = ${telegramId}
      ORDER BY created_at DESC
      LIMIT 1
    `) as Array<{ city: string | null }>;

    const city = String(latest?.city ?? "");
    if (city && (cityMatchKey(city) === cityMatchKey("Москва") || isMoscow(city))) {
      continue;
    }

    const id = applicationId(telegramId);
    await sql`
      INSERT INTO master_applications (
        id, telegram_user_id, city, contact_method, name, created_at
      )
      VALUES (
        ${id},
        ${telegramId},
        ${"Москва"},
        ${"telegram"},
        ${"Админ Током"},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET city = ${"Москва"}, created_at = NOW()
    `;
  }
}
