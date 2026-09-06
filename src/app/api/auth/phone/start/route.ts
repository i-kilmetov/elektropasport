import { randomUUID } from "crypto";
import { ownerAdminTelegramId } from "@/lib/admin";
import { appEnvFromRequest } from "@/lib/app-env";
import { dbErrorResponse, ensureSchema, getSql, insertPhoneAuthChallenge } from "@/lib/db";
import {
  assertPhoneAuthAvailable,
  PhoneAuthError,
  phoneAuthErrorResponse,
} from "@/lib/phone-auth-server";
import {
  generateLocalPhoneOtp,
  isPhoneAuthAllowlisted,
  localPhoneOtpRequestId,
  normalizeRuPhoneDigits,
  PHONE_CODE_NOT_DELIVERED_MESSAGE,
  ruPhoneToE164,
} from "@/lib/phone-auth";
import { isTelegramUnreachable } from "@/lib/telegram-fetch";
import {
  gatewayCheckSendAbility,
  gatewaySendVerificationMessage,
} from "@/lib/telegram-gateway";
import { sendTelegramMessage } from "@/lib/telegram-notify";

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

    let gatewayRequestId: string | null = null;
    try {
      const ability = await gatewayCheckSendAbility(phoneE164);
      gatewayRequestId = ability.request_id;
      await gatewaySendVerificationMessage(phoneE164, {
        requestId: gatewayRequestId,
      });
    } catch (primaryError) {
      console.error("telegram gateway send (ability path)", primaryError);
      try {
        const sent = await gatewaySendVerificationMessage(phoneE164);
        gatewayRequestId = sent.request_id;
      } catch (fallbackError) {
        console.error("telegram gateway send (direct path)", fallbackError);
        if (
          !(
            isTelegramUnreachable(primaryError) ||
            isTelegramUnreachable(fallbackError)
          )
        ) {
          throw new PhoneAuthError(PHONE_CODE_NOT_DELIVERED_MESSAGE, 400);
        }
        // Amvera Moscow cannot reach gatewayapi.telegram.org, but api.telegram.org
        // works — deliver the OTP through the bot to the admin chat.
        gatewayRequestId = null;
      }
    }

    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

    if (!gatewayRequestId) {
      const adminChatId = ownerAdminTelegramId();
      if (adminChatId == null) {
        throw new PhoneAuthError(
          "Telegram Gateway недоступен, а TELEGRAM_ADMIN_CHAT_ID не задан",
          400,
        );
      }
      const code = generateLocalPhoneOtp();
      gatewayRequestId = localPhoneOtpRequestId(challengeId, code);
      try {
        await sendTelegramMessage(
          adminChatId,
          `Код входа Током: ${code}\nНомер: ${phoneE164}\nДействует 5 минут.`,
        );
      } catch (error) {
        console.error("phone auth bot otp send", error);
        throw new PhoneAuthError(
          "Не удалось отправить код в Telegram — напишите боту /start и попробуйте снова",
          400,
        );
      }
    }

    const challenge = await insertPhoneAuthChallenge({
      id: challengeId,
      phoneE164,
      phoneDigits,
      gatewayRequestId,
      appEnv: env,
      expiresAt,
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
