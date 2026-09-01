import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { BRAND_YELLOW } from "@/components/brand-logo";
import { isProductionLaunchWaitlistHost, isTestAppHost } from "@/lib/app-env";
import { isBrowserLoginEnabled } from "@/lib/phone-auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>;
}) {
  const [h, sp] = await Promise.all([headers(), searchParams]);
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  const launchWaitlist =
    (isProductionLaunchWaitlistHost(host) || sp.waitlist === "1") &&
    !isBrowserLoginEnabled();
  const skipBootSplash = isTestAppHost(host);

  return (
    <main
      className="min-h-[var(--app-height,100dvh)] w-full"
      style={skipBootSplash ? { backgroundColor: BRAND_YELLOW } : undefined}
    >
      <AppShell launchWaitlist={launchWaitlist} skipBootSplash={skipBootSplash} />
    </main>
  );
}
