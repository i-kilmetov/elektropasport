"use client";

import { authHeaders, canUseServerAuth } from "@/lib/client-auth";

export type UserProfile = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  /** 10 digits without country code */
  phoneDigits?: string;
  /** Schematic avatar id */
  avatarId?: string;
};

const PROFILE_KEY = "elektropasport:user-profile";

function splitLegacyDisplayName(value: unknown): {
  firstName?: string;
  lastName?: string;
} {
  if (typeof value !== "string") return {};
  const full = value.trim();
  if (!full) return {};
  const space = full.indexOf(" ");
  if (space === -1) return { firstName: full };
  return {
    firstName: full.slice(0, space).trim() || undefined,
    lastName: full.slice(space + 1).trim() || undefined,
  };
}

function profileHasData(profile: UserProfile): boolean {
  return Boolean(
    profile.firstName ||
      profile.lastName ||
      profile.birthDate ||
      profile.phoneDigits ||
      profile.avatarId,
  );
}

function sanitizeProfile(parsed: Partial<UserProfile> & { displayName?: string }): UserProfile {
  const legacy = splitLegacyDisplayName(parsed.displayName);
  const next: UserProfile = {};
  const firstName =
    (typeof parsed.firstName === "string" && parsed.firstName.trim()) ||
    legacy.firstName;
  const lastName =
    (typeof parsed.lastName === "string" && parsed.lastName.trim()) ||
    legacy.lastName;
  if (firstName) next.firstName = firstName.slice(0, 64);
  if (lastName) next.lastName = lastName.slice(0, 64);
  if (typeof parsed.birthDate === "string" && parsed.birthDate.trim()) {
    next.birthDate = parsed.birthDate.trim();
  }
  if (typeof parsed.phoneDigits === "string") {
    const digits = parsed.phoneDigits.replace(/\D/g, "").slice(0, 10);
    if (digits) next.phoneDigits = digits;
  }
  if (typeof parsed.avatarId === "string" && parsed.avatarId.trim()) {
    next.avatarId = parsed.avatarId.trim();
  }
  return next;
}

function writeLocalProfile(profile: UserProfile): UserProfile {
  const next = sanitizeProfile(profile);
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    // private mode
  }
  return next;
}

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    return sanitizeProfile(JSON.parse(raw) as UserProfile & { displayName?: string });
  } catch {
    return {};
  }
}

export function saveUserProfile(patch: Partial<UserProfile>): UserProfile {
  return writeLocalProfile({ ...getUserProfile(), ...patch });
}

export function formatProfileDisplayName(profile: UserProfile): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Ошибка ${res.status}`;
  } catch {
    return `Ошибка ${res.status}`;
  }
}

/** Load profile from server (and migrate local-only data once if needed). */
export async function syncUserProfileFromServer(): Promise<UserProfile> {
  const local = getUserProfile();
  if (!canUseServerAuth()) return local;

  try {
    const res = await fetch("/api/profile", {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 503) return local;
      throw new Error(await parseError(res));
    }

    const data = (await res.json()) as { profile?: UserProfile };
    const remote = sanitizeProfile(data.profile ?? {});

    if (!profileHasData(remote) && profileHasData(local)) {
      return persistUserProfile(local);
    }

    if (profileHasData(remote)) {
      return writeLocalProfile(remote);
    }

    return local;
  } catch (error) {
    console.error(error);
    return local;
  }
}

/** Save full profile locally and to the server when authenticated. */
export async function persistUserProfile(
  profile: UserProfile,
): Promise<UserProfile> {
  const next = writeLocalProfile(profile);
  if (!canUseServerAuth()) return next;

  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(next),
  });

  if (!res.ok) {
    if (res.status === 503) return next;
    throw new Error(await parseError(res));
  }

  const data = (await res.json()) as { profile?: UserProfile };
  if (data.profile) {
    return writeLocalProfile(data.profile);
  }
  return next;
}

export function formatPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 8);
  const p4 = d.slice(8, 10);
  let out = "";
  if (!p1) return out;
  if (d.length <= 3) return p1;
  out = `(${p1}) `;
  if (p2) out += p2;
  if (p2.length === 3 && p3) out += "-";
  if (p3) out += p3;
  if (p3.length === 2 && p4) out += "-";
  if (p4) out += p4;
  return out;
}
