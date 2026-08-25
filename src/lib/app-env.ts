/** Staging host for previewing unreleased product logic. */
export const TEST_APP_HOST = "test.tokom.ru";

/** Legacy/alternate host — redirect to {@link TEST_APP_HOST} in middleware. */
export const TEST_APP_WWW_HOST = "www.test.tokom.ru";

export function normalizeHost(host: string | null | undefined): string {
  return host?.split(":")[0]?.toLowerCase() ?? "";
}

export function isTestAppHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  return normalized === TEST_APP_HOST || normalized === TEST_APP_WWW_HOST;
}

export function isTestAppWwwHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === TEST_APP_WWW_HOST;
}

/** Home appliances UI — enabled by default; set NEXT_PUBLIC_HOME_APPLIANCES=false to disable. */
export function homeAppliancesEnabledForHost(
  _host?: string | null,
): boolean {
  return process.env.NEXT_PUBLIC_HOME_APPLIANCES !== "false";
}
