import { ensureSchema, getSql } from "@/lib/db";
import { isPhoneAuthStorageId } from "@/lib/phone-auth";

/**
 * Move all data from a phone-auth synthetic account into a real Telegram account.
 * Deletes the source row after reassignment.
 */
export async function mergePhoneAuthAccountInto(
  fromStorageId: number,
  toStorageId: number,
): Promise<boolean> {
  if (fromStorageId === toStorageId) return false;
  if (!isPhoneAuthStorageId(fromStorageId)) return false;
  if (isPhoneAuthStorageId(toStorageId)) return false;

  const sql = getSql();
  await ensureSchema();

  const [source] = (await sql`
    SELECT telegram_id FROM users WHERE telegram_id = ${fromStorageId} LIMIT 1
  `) as Array<{ telegram_id: string | number }>;
  const [target] = (await sql`
    SELECT telegram_id FROM users WHERE telegram_id = ${toStorageId} LIMIT 1
  `) as Array<{ telegram_id: string | number }>;
  if (!source || !target) return false;

  await sql`
    UPDATE panels SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE install_requests SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE install_requests SET master_telegram_id = ${toStorageId}
    WHERE master_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE master_applications SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE panel_shares SET owner_telegram_id = ${toStorageId}
    WHERE owner_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE sbp_payments SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE push_subscriptions SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE appliance_passport_photos SET owner_telegram_id = ${toStorageId}
    WHERE owner_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE panel_photos SET owner_telegram_id = ${toStorageId}
    WHERE owner_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE school_promo_redemptions SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE school_promo_codes SET created_by = ${toStorageId}
    WHERE created_by = ${fromStorageId}
  `;
  await sql`
    UPDATE waitlist SET telegram_user_id = ${toStorageId}
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    UPDATE master_dispatch_messages SET master_telegram_id = ${toStorageId}
    WHERE master_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE master_feedback SET master_telegram_id = ${toStorageId}
    WHERE master_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE master_feedback SET user_telegram_id = ${toStorageId}
    WHERE user_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE invite_link_hits SET inviter_telegram_id = ${toStorageId}
    WHERE inviter_telegram_id = ${fromStorageId}
  `;
  await sql`
    UPDATE invite_link_hits SET invitee_telegram_id = ${toStorageId}
    WHERE invitee_telegram_id = ${fromStorageId}
  `;

  await sql`
    DELETE FROM invite_events
    WHERE inviter_telegram_id = ${fromStorageId}
      AND invitee_telegram_id IN (
        SELECT invitee_telegram_id FROM invite_events WHERE inviter_telegram_id = ${toStorageId}
      )
  `;
  await sql`
    UPDATE invite_events SET inviter_telegram_id = ${toStorageId}
    WHERE inviter_telegram_id = ${fromStorageId}
  `;
  await sql`
    DELETE FROM invite_events
    WHERE invitee_telegram_id = ${fromStorageId}
      AND inviter_telegram_id IN (
        SELECT inviter_telegram_id FROM invite_events WHERE invitee_telegram_id = ${toStorageId}
      )
  `;
  await sql`
    UPDATE invite_events SET invitee_telegram_id = ${toStorageId}
    WHERE invitee_telegram_id = ${fromStorageId}
  `;

  await sql`
    UPDATE users SET
      school_paid_grades = (
        SELECT COALESCE(jsonb_agg(DISTINCT value), '[]'::jsonb)
        FROM (
          SELECT jsonb_array_elements(COALESCE(u1.school_paid_grades, '[]'::jsonb)) AS value
          FROM users u1 WHERE u1.telegram_id = ${toStorageId}
          UNION
          SELECT jsonb_array_elements(COALESCE(u2.school_paid_grades, '[]'::jsonb)) AS value
          FROM users u2 WHERE u2.telegram_id = ${fromStorageId}
        ) merged
      ),
      panel_limit_unlocked = (
        SELECT COALESCE(u1.panel_limit_unlocked, FALSE) OR COALESCE(u2.panel_limit_unlocked, FALSE)
        FROM users u1, users u2
        WHERE u1.telegram_id = ${toStorageId} AND u2.telegram_id = ${fromStorageId}
      ),
      profile_first_name = COALESCE(
        (SELECT profile_first_name FROM users WHERE telegram_id = ${toStorageId}),
        (SELECT profile_first_name FROM users WHERE telegram_id = ${fromStorageId})
      ),
      profile_last_name = COALESCE(
        (SELECT profile_last_name FROM users WHERE telegram_id = ${toStorageId}),
        (SELECT profile_last_name FROM users WHERE telegram_id = ${fromStorageId})
      ),
      phone_digits = COALESCE(
        (SELECT phone_digits FROM users WHERE telegram_id = ${toStorageId}),
        (SELECT phone_digits FROM users WHERE telegram_id = ${fromStorageId})
      ),
      updated_at = NOW()
    WHERE telegram_id = ${toStorageId}
  `;

  await sql`
    UPDATE waitlist SET telegram_user_id = NULL
    WHERE telegram_user_id = ${fromStorageId}
  `;
  await sql`
    DELETE FROM users WHERE telegram_id = ${fromStorageId}
  `;

  return true;
}

export async function mergePhoneAccountByDigits(
  targetStorageId: number,
  phoneDigits: string,
): Promise<boolean> {
  const sql = getSql();
  await ensureSchema();
  const rows = (await sql`
    SELECT telegram_id
    FROM users
    WHERE phone_digits = ${phoneDigits}
      AND telegram_id <> ${targetStorageId}
    LIMIT 5
  `) as Array<{ telegram_id: string | number }>;

  let merged = false;
  for (const row of rows) {
    const fromId = Number(row.telegram_id);
    if (isPhoneAuthStorageId(fromId)) {
      merged = (await mergePhoneAuthAccountInto(fromId, targetStorageId)) || merged;
    }
  }
  return merged;
}
