import { ensureSchema, getSql } from "@/lib/db";
import { cityMatchKey, isMoscow } from "@/lib/lead-services";

export async function cityHasConnectedMaster(city: string): Promise<boolean> {
  const want = cityMatchKey(city);
  if (!want) return false;

  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT ma.city
    FROM users u
    INNER JOIN LATERAL (
      SELECT city
      FROM master_applications
      WHERE telegram_user_id = u.telegram_id
      ORDER BY created_at DESC
      LIMIT 1
    ) ma ON true
    WHERE u.role = 'master'
  `) as Array<{ city: string | null }>;

  return rows.some((row) => {
    const got = String(row.city ?? "");
    if (!got.trim()) return false;
    if (cityMatchKey(got) === want) return true;
    return isMoscow(city) && isMoscow(got);
  });
}
