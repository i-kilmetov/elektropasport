/** Staging host for gated preview (password → then same product UI as prod). */
export const TEST_APP_HOST = "test.tokom.ru";

/** Legacy/alternate host — redirect to {@link TEST_APP_HOST} in middleware. */
export const TEST_APP_WWW_HOST = "www.test.tokom.ru";

export type AppEnv = "prod" | "test";

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  const trimmed = host.split(",")[0]?.trim() ?? "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  return withoutProtocol.split("/")[0]?.split(":")[0]?.toLowerCase() ?? "";
}

export function isTestAppHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  return normalized === TEST_APP_HOST || normalized === TEST_APP_WWW_HOST;
}

export function isTestAppWwwHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === TEST_APP_WWW_HOST;
}

export function appEnvFromHost(host: string | null | undefined): AppEnv {
  return isTestAppHost(host) ? "test" : "prod";
}

export function appEnvFromRequest(request: Request): AppEnv {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    new URL(request.url).host;
  return appEnvFromHost(host);
}

/**
 * DB primary key for a Telegram user in this environment.
 * Test uses the negated id so the same person has a separate row from prod.
 */
export function toStorageTelegramId(
  realTelegramId: number,
  env: AppEnv,
): number {
  const id = Math.abs(realTelegramId);
  return env === "test" ? -id : id;
}

/** Real Telegram chat id for Bot API (always positive). */
export function toTelegramChatId(storageOrRealId: number): number {
  return Math.abs(storageOrRealId);
}

/** Absolute Telegram user id — webhook callbacks always use positive ids. */
export function absTelegramId(telegramId: number): number {
  return Math.abs(telegramId);
}

/** Home appliances UI — enabled by default on every host. */
export function homeAppliancesEnabledForHost(
  _host?: string | null,
): boolean {
  return process.env.NEXT_PUBLIC_HOME_APPLIANCES !== "false";
}

/** Production apex is in pre-launch waitlist mode (no Telegram login). */
export function isProductionLaunchWaitlistHost(
  host: string | null | undefined,
): boolean {
  const normalized = normalizeHost(host);
  if (
    !normalized ||
    normalized === "localhost" ||
    normalized === "127.0.0.1"
  ) {
    return false;
  }
  return !isTestAppHost(normalized);
}

/**
 * Waitlist gate at runtime. SSR uses the production host so the inverted T
 * is already centered on first paint instead of hydrating from the auth intro.
 */
export function isLaunchWaitlistRuntime(): boolean {
  if (typeof window !== "undefined") {
    return isProductionLaunchWaitlistHost(window.location.hostname);
  }
  if (process.env.VERCEL_ENV !== "production") return false;
  return isProductionLaunchWaitlistHost(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "tokom.ru",
  );
}
