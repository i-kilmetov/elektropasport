import { TestLoginForm } from "@/components/screens/test-login-form";

export default async function TestLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    reason?: string;
    error?: string;
    retry?: string;
  }>;
}) {
  const params = await searchParams;
  const retryRaw = params.retry?.trim();
  const retryAfterMs = retryRaw ? Number(retryRaw) : null;
  return (
    <TestLoginForm
      next={params.next?.trim() || "/"}
      idleReason={params.reason === "idle"}
      initialError={params.error?.trim() || null}
      initialRetryAfterMs={
        retryAfterMs != null && Number.isFinite(retryAfterMs) && retryAfterMs > 0
          ? retryAfterMs
          : null
      }
    />
  );
}
