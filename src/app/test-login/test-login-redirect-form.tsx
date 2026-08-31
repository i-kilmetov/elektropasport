"use client";

import { useSearchParams } from "next/navigation";
import { TestLoginForm } from "@/components/screens/test-login-form";

export function TestLoginRedirectForm() {
  const searchParams = useSearchParams();
  return (
    <TestLoginForm
      next={searchParams.get("next") || "/"}
      idleReason={searchParams.get("reason") === "idle"}
    />
  );
}
