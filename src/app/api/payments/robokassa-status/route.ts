import { PRODUCTION_APP_URL, TEST_APP_URL } from "@/lib/app-url";
import {
  isRobokassaConfigured,
  isRobokassaTestMode,
  robokassaBrowserReturnUrl,
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
    /**
     * Preferred Success/Fail in cabinet (https). Per-payment SuccessUrl2 also
     * points here and overrides cabinet when signed into the payment link.
     */
    successUrlProd: robokassaBrowserReturnUrl(PRODUCTION_APP_URL),
    successUrlTest: robokassaBrowserReturnUrl(TEST_APP_URL),
    successApi: `${PRODUCTION_APP_URL}/api/payments/robokassa-success`,
    merchantLogin: maskedMerchantLogin(),
    hint: isRobokassaTestMode()
      ? "В кабинете: Result URL → resultUrlTest; Success/Fail → successUrlTest (https, не http и не /school). В ссылке оплаты используется SuccessUrl2. Нужны тестовые пароли #1/#2."
      : "ResultURL должен отвечать OK{InvId}. Success/Fail в кабинете — https://tokom.ru/pay/return (не http).",
  });
}
