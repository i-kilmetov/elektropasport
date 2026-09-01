import { isInviteToken } from "@/lib/invites";

export const PENDING_INVITE_KEY = "elektropasport:pending-invite";

export function rememberPendingInviteToken(token: string | null | undefined): void {
  if (typeof window === "undefined" || !isInviteToken(token)) return;
  try {
    localStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // private mode
  }
}

export function readPendingInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = localStorage.getItem(PENDING_INVITE_KEY)?.trim();
    if (isInviteToken(fromStorage)) return fromStorage;
  } catch {
    // ignore
  }
  return null;
}

export function clearPendingInviteToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // ignore
  }
}
