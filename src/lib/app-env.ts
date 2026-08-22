/** Staging host for previewing unreleased product logic. */
export const TEST_APP_HOST = "test.tokom.ru";

export function normalizeHost(host: string | null | undefined): string {
  return host?.split(":")[0]?.toLowerCase() ?? "";
}

export function isTestAppHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === TEST_APP_HOST;
}

/** Home appliances UI is enabled only on the test subdomain. */
export function homeAppliancesEnabledForHost(host: string | null | undefined): boolean {
  if (process.env.NEXT_PUBLIC_HOME_APPLIANCES === "true") return true;
  if (process.env.NEXT_PUBLIC_HOME_APPLIANCES === "false") return false;
  return isTestAppHost(host);
}
