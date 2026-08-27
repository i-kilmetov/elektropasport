import { DAY_MS } from "@/lib/school/quiz";

const ABANDON_KEY = "elektropasport:master-test-abandon";

export function markMasterTestStarted(): void {
  try {
    localStorage.setItem(ABANDON_KEY, String(Date.now()));
  } catch {
    // private mode
  }
}

export function clearMasterTestAbandon(): void {
  try {
    localStorage.removeItem(ABANDON_KEY);
  } catch {
    // private mode
  }
}

export function masterTestAbandonLockUntil(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ABANDON_KEY);
    if (!raw) return null;
    const at = Number(raw);
    if (!Number.isFinite(at) || at <= 0) return null;
    const until = at + DAY_MS;
    if (Date.now() >= until) return null;
    return until;
  } catch {
    return null;
  }
}
