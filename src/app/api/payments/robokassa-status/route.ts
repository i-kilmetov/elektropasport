import { PRODUCTION_WEBHOOK_ORIGIN } from "@/lib/app-url";
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
  return Response.json({
    configured: isRobokassaConfigured(),
    testMode: isRobokassaTestMode(),
    resultUrl: `${PRODUCTION_WEBHOOK_ORIGIN}/api/payments/robokassa-result`,
    merchantLogin: maskedMerchantLogin(),
  });
}
