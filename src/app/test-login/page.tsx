import { Suspense } from "react";
import { TestLoginRedirectForm } from "./test-login-redirect-form";

export default function TestLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
          <p className="text-[14px] text-zinc-500">Загрузка…</p>
        </main>
      }
    >
      <TestLoginRedirectForm />
    </Suspense>
  );
}
