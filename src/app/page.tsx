import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { isProductionLaunchWaitlistHost, isTestAppHost } from "@/lib/app-env";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>;
}) {
  const [h, sp] = await Promise.all([headers(), searchParams]);
  const host =
    h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
  const launchWaitlist =
    isProductionLaunchWaitlistHost(host) || sp.waitlist === "1";
  const skipBootSplash = isTestAppHost(host);

  return (
    <main className="min-h-[var(--app-height,100dvh)] w-full">
      <AppShell launchWaitlist={launchWaitlist} skipBootSplash={skipBootSplash} />
    </main>
  );
}
