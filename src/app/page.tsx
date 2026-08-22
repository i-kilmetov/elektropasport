import { cookies, headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { TestLoginForm } from "@/components/screens/test-login-form";
import { isTestAppHost } from "@/lib/app-env";
import { TEST_SITE_COOKIE, verifyTestSiteCookie } from "@/lib/test-site-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const host = (await headers()).get("host");
  if (isTestAppHost(host)) {
    const token = (await cookies()).get(TEST_SITE_COOKIE)?.value;
    if (!(await verifyTestSiteCookie(token))) {
      return <TestLoginForm />;
    }
  }

  return (
    <main className="min-h-[var(--app-height,100dvh)] w-full">
      <AppShell />
    </main>
  );
}
