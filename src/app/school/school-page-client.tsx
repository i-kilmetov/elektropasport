"use client";

import { useRouter } from "next/navigation";
import { SchoolScreen } from "@/components/screens/school-screen";
import { useAppStatusBarTheme } from "@/hooks/use-status-bar-theme";

export function SchoolPageClient() {
  const router = useRouter();
  useAppStatusBarTheme(true, false);

  return (
    <main className="relative min-h-[var(--app-height,100dvh)] w-full bg-[var(--bg)] text-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(17,17,19,0.035),transparent_55%)]" />
      <div className="relative z-10 mx-auto flex min-h-[var(--app-height,100dvh)] w-full max-w-xl flex-col lg:max-w-3xl lg:px-8 lg:py-8">
        <SchoolScreen onBack={() => router.push("/")} />
      </div>
    </main>
  );
}
