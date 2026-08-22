import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { TestSiteGate } from "@/components/test-site-gate";
import { isTestAppHost } from "@/lib/app-env";

export const dynamic = "force-dynamic";

export default async function Home() {
  const host = (await headers()).get("host");
  if (isTestAppHost(host)) {
    return <TestSiteGate />;
  }

  return (
    <main className="min-h-[var(--app-height,100dvh)] w-full">
      <AppShell />
    </main>
  );
}
