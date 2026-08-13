"use client";

import { authHeaders, canUseServerAuth } from "@/lib/client-auth";

export type UserGender = "male" | "female" | "unspecified";

export type UserProfile = {
  displayName?: string;
  birthDate?: string;
  gender?: UserGender;
  /** 10 digits without country code */
  phoneDigits?: string;
  /** Schematic avatar id */
  avatarId?: string;
};

const PROFILE_KEY = "elektropasport:user-profile";

function profileHasData(profile: UserProfile): boolean {
  return Boolean(
    profile.displayName ||
      profile.birthDate ||
      profile.gender ||
      profile.phoneDigits ||
      profile.avatarId,
  );
}

function sanitizeProfile(parsed: Partial<UserProfile>): UserProfile {
  const next: UserProfile = {};
  if (typeof parsed.displayName === "string" && parsed.displayName.trim()) {
    next.displayName = parsed.displayName.trim().slice(0, 80);
  }
  if (typeof parsed.birthDate === "string" && parsed.birthDate.trim()) {
    next.birthDate = parsed.birthDate.trim();
  }
  if (
    parsed.gender === "male" ||
    parsed.gender === "female" ||
    parsed.gender === "unspecified"
  ) {
    next.gender = parsed.gender;
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
    return sanitizeProfile(JSON.parse(raw) as UserProfile);
  } catch {
    return {};
  }
}

export function saveUserProfile(patch: Partial<UserProfile>): UserProfile {
  return writeLocalProfile({ ...getUserProfile(), ...patch });
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
