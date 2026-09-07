import { PRODUCTION_APP_URL, TEST_APP_URL } from "@/lib/app-url";
import {
  isRobokassaConfigured,
  isRobokassaTestMode,
} from "@/lib/robokassa";

function maskedMerchantLogin(): string | null {
  const login = process.env.ROBOKASSA_MERCHANT_LOGIN?.trim();
  if (!login) return null;
  if (login.length <= 3) return `${login[0] ?? "*"}**`;
  return `${login.slice(0, 3)}***`;
}

/** Public health check — no secrets, for post-deploy verification. */
export async function GET() {
  const hasTestPasswords = Boolean(
    process.env.ROBOKASSA_TEST_PASSWORD1?.trim() &&
      process.env.ROBOKASSA_TEST_PASSWORD2?.trim(),
  );
  return Response.json({
    configured: isRobokassaConfigured(),
    testMode: isRobokassaTestMode(),
    hasDedicatedTestPasswords: hasTestPasswords,
    hashAlg: (process.env.ROBOKASSA_HASH_ALG ?? "md5").trim().toLowerCase(),
    /** Set this as Result URL in the Robokassa shop (server callback). */
    resultUrlProd: `${PRODUCTION_APP_URL}/api/payments/robokassa-result`,
    resultUrlTest: `${TEST_APP_URL}/api/payments/robokassa-result`,
    /** Optional SuccessURL fallback (browser returns here; app also syncs query). */
    successApi: `${PRODUCTION_APP_URL}/api/payments/robokassa-success`,
    merchantLogin: maskedMerchantLogin(),
    hint: isRobokassaTestMode()
      ? "В тестовом режиме в ResultURL/SuccessURL нужны тестовые пароли #1/#2 из кабинета Robokassa (ROBOKASSA_TEST_PASSWORD1/2 или основные PASSWORD1/2)."
      : "ResultURL должен быть доступен из интернета и отвечать OK{InvId}.",
  });
}
