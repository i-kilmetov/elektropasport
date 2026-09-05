import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { BRAND_YELLOW } from "@/components/brand-logo";
import {
  isProductionLaunchWaitlistHost,
  isTestAppHost,
  publicHostFromHeaders,
} from "@/lib/app-env";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>;
}) {
  const [h, sp] = await Promise.all([headers(), searchParams]);
  const host = publicHostFromHeaders(h);
  const launchWaitlist =
    isProductionLaunchWaitlistHost(host) || sp.waitlist === "1";
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
