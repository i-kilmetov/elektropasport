import { resolveRequestOrigin } from "@/lib/app-url";

/** Staging host for gated preview (password → then same product UI as prod). */
export const TEST_APP_HOST = "test.tokom.ru";

/** Legacy/alternate host — redirect to {@link TEST_APP_HOST} in middleware. */
export const TEST_APP_WWW_HOST = "www.test.tokom.ru";

const PROD_WAITLIST_HOSTS = new Set([
  "tokom.ru",
  "www.tokom.ru",
  "elektropasport.vercel.app",
]);

export type AppEnv = "prod" | "test";

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  const trimmed = host.split(",")[0]?.trim() ?? "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  return withoutProtocol.split("/")[0]?.split(":")[0]?.toLowerCase() ?? "";
}

function isJunkPublicHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return true;
  if (
    normalized === "0.0.0.0" ||
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::" ||
    normalized === "::1"
  ) {
    return true;
  }
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized);
}

/**
 * Browser-facing host from request headers.
 * Prefer staging when any candidate is test.tokom.ru (Amvera may set a
 * misleading X-Forwarded-Host while Host is correct, or the reverse).
 */
export function publicHostFromHeaders(
  headers: Headers | { get(name: string): string | null },
): string {
  const candidates = [
    headers.get("host"),
    headers.get("x-forwarded-host")?.split(",")[0]?.trim(),
  ];
  for (const raw of candidates) {
    if (isTestAppHost(raw)) return normalizeHost(raw);
  }
  for (const raw of candidates) {
    const normalized = normalizeHost(raw);
    if (normalized && !isJunkPublicHost(normalized)) return normalized;
  }
  return "";
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
  const fromHeaders = publicHostFromHeaders(request.headers);
  if (isTestAppHost(fromHeaders)) return "test";
  try {
    if (isTestAppHost(new URL(resolveRequestOrigin(request)).host)) {
      return "test";
    }
  } catch {
    // fall through
  }
  if (fromHeaders) return appEnvFromHost(fromHeaders);
  try {
    return appEnvFromHost(new URL(request.url).host);
  } catch {
    return "prod";
  }
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

/** One Telegram chat per master — skip duplicate prod/test signed ids. */
export function dedupeMasterStorageIds(storageIds: number[]): number[] {
  const byChat = new Map<number, number>();
  for (const storageId of storageIds) {
    const chatId = toTelegramChatId(storageId);
    const prev = byChat.get(chatId);
    if (prev == null) {
      byChat.set(chatId, storageId);
      continue;
    }
    if (storageId > 0 && prev < 0) {
      byChat.set(chatId, storageId);
    }
  }
  return [...byChat.values()];
}

/** Home appliances UI — enabled by default on every host. */
export function homeAppliancesEnabledForHost(
  _host?: string | null,
): boolean {
  return process.env.NEXT_PUBLIC_HOME_APPLIANCES !== "false";
}

/**
 * «Проверка и обслуживание» — enabled by default.
 * Set NEXT_PUBLIC_MAINTENANCE_REMINDERS=false to hide UI and skip cron.
 */
export function maintenanceRemindersEnabledForHost(
  _host?: string | null,
): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_REMINDERS !== "false";
}

/** Production apex is in pre-launch waitlist mode (no Telegram login). */
export function isProductionLaunchWaitlistHost(
  host: string | null | undefined,
): boolean {
  const normalized = normalizeHost(host);
  if (!normalized || isJunkPublicHost(normalized) || isTestAppHost(normalized)) {
    return false;
  }
  // Only known public prod hosts — never treat Amvera bind addresses as waitlist.
  return PROD_WAITLIST_HOSTS.has(normalized);
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
