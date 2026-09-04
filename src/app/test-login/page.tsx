import { TestLoginForm } from "@/components/screens/test-login-form";

export default async function TestLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const params = await searchParams;
  return (
    <TestLoginForm
      next={params.next?.trim() || "/"}
      idleReason={params.reason === "idle"}
    />
  );
}
