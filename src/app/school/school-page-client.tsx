"use client";

import { useRouter } from "next/navigation";
import { SchoolScreen } from "@/components/screens/school-screen";

export function SchoolPageClient() {
  const router = useRouter();
  return (
    <main className="min-h-[var(--app-height,100dvh)] w-full">
      <SchoolScreen onBack={() => router.push("/")} />
    </main>
  );
}
