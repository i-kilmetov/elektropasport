"use client";

export type UserGender = "male" | "female" | "unspecified";

export type UserProfile = {
  birthDate?: string;
  gender?: UserGender;
  /** 10 digits without country code */
  phoneDigits?: string;
};

const PROFILE_KEY = "elektropasport:user-profile";

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserProfile;
    return {
      birthDate: typeof parsed.birthDate === "string" ? parsed.birthDate : undefined,
      gender:
        parsed.gender === "male" ||
        parsed.gender === "female" ||
        parsed.gender === "unspecified"
          ? parsed.gender
          : undefined,
      phoneDigits:
        typeof parsed.phoneDigits === "string"
          ? parsed.phoneDigits.replace(/\D/g, "").slice(0, 10)
          : undefined,
    };
  } catch {
    return {};
  }
}

export function saveUserProfile(patch: Partial<UserProfile>): UserProfile {
  const next: UserProfile = { ...getUserProfile(), ...patch };
  if (next.phoneDigits !== undefined) {
    next.phoneDigits = next.phoneDigits.replace(/\D/g, "").slice(0, 10) || undefined;
  }
  if (next.birthDate === "") delete next.birthDate;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    // private mode
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
