import { randomUUID } from "crypto";
import { appEnvFromRequest } from "@/lib/app-env";
import { dbErrorResponse, ensureSchema, getSql, insertPhoneAuthChallenge } from "@/lib/db";
import {
  assertPhoneAuthAvailable,
  PhoneAuthError,
  phoneAuthErrorResponse,
} from "@/lib/phone-auth-server";
import {
  isPhoneAuthAllowlisted,
  normalizeRuPhoneDigits,
  PHONE_CODE_NOT_DELIVERED_MESSAGE,
  ruPhoneToE164,
} from "@/lib/phone-auth";
import {
  gatewayCheckSendAbility,
  gatewaySendVerificationMessage,
} from "@/lib/telegram-gateway";

const START_COOLDOWN_MS = 60_000;
const CHALLENGE_TTL_MS = 5 * 60_000;
const STUB_DELAY_MS = 2_800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  try {
    assertPhoneAuthAvailable();

    const body = (await request.json().catch(() => ({}))) as {
      phone?: unknown;
    };
    const phoneRaw = typeof body.phone === "string" ? body.phone : "";
    const phoneDigits = normalizeRuPhoneDigits(phoneRaw);
    if (!phoneDigits) {
      throw new PhoneAuthError("Введите номер телефона в формате +7 …", 400);
    }

    const env = appEnvFromRequest(request);
    const phoneE164 = ruPhoneToE164(phoneDigits);

    // Soft stub: only the allowlisted number may receive Gateway codes for now.
    if (!isPhoneAuthAllowlisted(phoneDigits)) {
      await sleep(STUB_DELAY_MS);
      // Use 400 (not 502): Amvera edge replaces 502 with an HTML page, and the
      // client then shows a generic "Не удалось выполнить запрос".
      throw new PhoneAuthError(PHONE_CODE_NOT_DELIVERED_MESSAGE, 400);
    }

    await ensureSchema();
    const sql = getSql();
    const recent = (await sql`
      SELECT created_at
      FROM phone_auth_challenges
      WHERE phone_digits = ${phoneDigits}
        AND app_env = ${env}
        AND verified_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `) as Array<{ created_at: string | Date }>;

    if (recent[0]) {
      const lastAt = new Date(recent[0].created_at).getTime();
      if (Date.now() - lastAt < START_COOLDOWN_MS) {
        throw new PhoneAuthError(
          "Код уже отправлен — подождите минуту перед повторной отправкой",
          429,
        );
      }
    }

    let gatewayRequestId: string;
    try {
      const ability = await gatewayCheckSendAbility(phoneE164);
      gatewayRequestId = ability.request_id;
      await gatewaySendVerificationMessage(phoneE164, {
        requestId: gatewayRequestId,
      });
    } catch {
      try {
        const sent = await gatewaySendVerificationMessage(phoneE164);
        gatewayRequestId = sent.request_id;
      } catch {
        throw new PhoneAuthError(PHONE_CODE_NOT_DELIVERED_MESSAGE, 400);
      }
    }

    const challenge = await insertPhoneAuthChallenge({
      id: randomUUID(),
      phoneE164,
      phoneDigits,
      gatewayRequestId,
      appEnv: env,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    });

    return Response.json({
      challengeId: challenge.id,
      phoneDigits: challenge.phoneDigits,
      expiresAt: challenge.expiresAt,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? phoneAuthErrorResponse(error);
  }
}
