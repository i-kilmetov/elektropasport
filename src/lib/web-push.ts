import webpush from "web-push";
import {
  deletePushSubscriptionByEndpoint,
  ensureSchema,
  listDistinctPushUserIds,
  listPushSubscriptions,
} from "@/lib/db";
import { getSql } from "@/lib/sql-client";

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
};

const VAPID_PUBLIC_KEY = "vapid_public";
const VAPID_PRIVATE_KEY = "vapid_private";

let vapidReady: Promise<{ publicKey: string; privateKey: string }> | null =
  null;

function envVapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  if (publicKey && privateKey) return { publicKey, privateKey };
  return null;
}

async function readStoredVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
} | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT key, value
    FROM schema_meta
    WHERE key = ${VAPID_PUBLIC_KEY} OR key = ${VAPID_PRIVATE_KEY}
  `) as Array<{ key: string; value: string }>;
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const publicKey = map.get(VAPID_PUBLIC_KEY)?.trim() ?? "";
  const privateKey = map.get(VAPID_PRIVATE_KEY)?.trim() ?? "";
  if (publicKey && privateKey) return { publicKey, privateKey };
  return null;
}

async function persistVapidKeys(keys: {
  publicKey: string;
  privateKey: string;
}): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO schema_meta (key, value)
    VALUES (${VAPID_PUBLIC_KEY}, ${keys.publicKey})
    ON CONFLICT (key) DO NOTHING
  `;
  await sql`
    INSERT INTO schema_meta (key, value)
    VALUES (${VAPID_PRIVATE_KEY}, ${keys.privateKey})
    ON CONFLICT (key) DO NOTHING
  `;
}

export async function getVapidCredentials(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  if (!vapidReady) {
    vapidReady = (async () => {
      const fromEnv = envVapidKeys();
      if (fromEnv) return fromEnv;

      try {
        const existing = await readStoredVapidKeys();
        if (existing) return existing;
      } catch {
        // schema_meta missing — fall through to full migrate
      }

      await ensureSchema();
      const afterMigrate = await readStoredVapidKeys();
      if (afterMigrate) return afterMigrate;

      const generated = webpush.generateVAPIDKeys();
      await persistVapidKeys(generated);
      const stored = await readStoredVapidKeys();
      return stored ?? generated;
    })().catch((error) => {
      vapidReady = null;
      throw error;
    });
  }
  return vapidReady;
}

function vapidSubject(): string {
  return (
    process.env.VAPID_SUBJECT?.trim() ||
    "mailto:support@tokom.ru"
  );
}

async function configureWebPush(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keys = await getVapidCredentials();
  webpush.setVapidDetails(vapidSubject(), keys.publicKey, keys.privateKey);
  return keys;
}

export async function sendWebPushToUser(
  telegramUserId: number,
  payload: WebPushPayload,
): Promise<{ sent: number }> {
  const keys = await configureWebPush();
  void keys;
  const subscriptions = await listPushSubscriptions(telegramUserId);
  if (subscriptions.length === 0) return { sent: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        const status =
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          typeof (error as { statusCode: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : 0;
        if (status === 404 || status === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint);
          return;
        }
        console.error("Web push send failed", status || error);
      }
    }),
  );

  return { sent };
}

/** Never throws — for request/webhook side-effects. */
export async function notifyUserWebPush(
  telegramUserId: number,
  payload: WebPushPayload,
): Promise<void> {
  try {
    await sendWebPushToUser(telegramUserId, payload);
  } catch (error) {
    console.error("Web push notify failed", error);
  }
}

export async function sendWebPushBroadcast(
  payload: WebPushPayload,
): Promise<{ users: number; sent: number }> {
  const ids = await listDistinctPushUserIds();
  let sent = 0;
  for (const telegramUserId of ids) {
    const result = await sendWebPushToUser(telegramUserId, payload);
    sent += result.sent;
  }
  return { users: ids.length, sent };
}
