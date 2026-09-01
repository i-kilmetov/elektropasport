"use client";

import {
  POST_AUTH_NEXT_KEY,
  POST_AUTH_SKIP_SPLASH_KEY,
  safeAuthNextPath,
} from "@/lib/auth-flow";
import {
  saveBrowserSession,
  type BrowserAuthUser,
} from "@/lib/client-auth";
import {
  clearPendingInviteToken,
  readPendingInviteToken,
} from "@/lib/invite-pending";

let cachedEnabled: boolean | null = null;
let enabledPromise: Promise<boolean> | null = null;

export async function fetchBrowserLoginEnabled(): Promise<boolean> {
  if (cachedEnabled != null) return cachedEnabled;
  if (enabledPromise) return enabledPromise;

  enabledPromise = fetch("/api/auth/phone/config", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return false;
      const data = (await res.json()) as { enabled?: boolean };
      cachedEnabled = Boolean(data.enabled);
      return cachedEnabled;
    })
    .catch(() => false)
    .finally(() => {
      enabledPromise = null;
    });

  return enabledPromise;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // ignore
  }
  return "Не удалось выполнить запрос";
}

export async function startPhoneLogin(phone: string): Promise<{
  challengeId: string;
  phoneDigits: string;
  expiresAt: string;
}> {
  const res = await fetch("/api/auth/phone/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as {
    challengeId: string;
    phoneDigits: string;
    expiresAt: string;
  };
}

export async function verifyPhoneLogin(input: {
  challengeId: string;
  code: string;
}): Promise<{ token: string; user: BrowserAuthUser }> {
  const inviteToken = readPendingInviteToken();
  const res = await fetch("/api/auth/phone/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeId: input.challengeId,
      code: input.code,
      inviteToken,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  const data = (await res.json()) as {
    token: string;
    user: BrowserAuthUser;
  };
  return data;
}

export function completeBrowserLogin(
  token: string,
  user: BrowserAuthUser,
  returnTo?: string,
): void {
  saveBrowserSession(token, user);
  clearPendingInviteToken();
  let next = safeAuthNextPath(returnTo);
  try {
    sessionStorage.setItem(POST_AUTH_SKIP_SPLASH_KEY, "1");
    if (!returnTo) {
      const stored = sessionStorage.getItem(POST_AUTH_NEXT_KEY);
      if (stored) next = safeAuthNextPath(stored);
    }
    sessionStorage.removeItem(POST_AUTH_NEXT_KEY);
  } catch {
    // private mode
  }
  window.location.assign(next);
}

export async function beginPhoneLogin(input: {
  phone: string;
  code: string;
  challengeId: string;
  returnTo?: string;
}): Promise<void> {
  const { token, user } = await verifyPhoneLogin({
    challengeId: input.challengeId,
    code: input.code,
  });
  completeBrowserLogin(token, user, input.returnTo);
}
