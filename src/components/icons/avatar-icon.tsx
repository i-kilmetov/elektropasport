"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const AVATAR_IDS = [
  "circle",
  "soft",
  "glasses",
  "beard",
  "bob",
  "cap",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return (
    typeof value === "string" &&
    (AVATAR_IDS as readonly string[]).includes(value)
  );
}

function FaceBase({
  className,
  children,
  skin = "#F3E7D9",
  stroke = "#3F3F46",
}: {
  className?: string;
  children?: ReactNode;
  skin?: string;
  stroke?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <circle cx="32" cy="32" r="30" fill="#F4F4F5" />
      <circle cx="32" cy="34" r="18" fill={skin} stroke={stroke} strokeWidth="1.5" />
      {children}
    </svg>
  );
}

export function AvatarIcon({
  id,
  className,
}: {
  id: AvatarId;
  className?: string;
}) {
  switch (id) {
    case "soft":
      return (
        <FaceBase className={className} skin="#F7E2CF">
          <path
            d="M18 26c4-10 24-10 28 0"
            fill="#5B4636"
            stroke="#3F3F46"
            strokeWidth="1.2"
          />
          <circle cx="25" cy="34" r="1.6" fill="#3F3F46" />
          <circle cx="39" cy="34" r="1.6" fill="#3F3F46" />
          <path
            d="M27 42c2.2 2.4 7.8 2.4 10 0"
            fill="none"
            stroke="#B45309"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </FaceBase>
      );
    case "glasses":
      return (
        <FaceBase className={className} skin="#EAD7C4">
          <path
            d="M16 24c6-9 26-9 32 0v4H16z"
            fill="#27272A"
            stroke="#18181B"
            strokeWidth="1"
          />
          <circle cx="25" cy="34" r="5" fill="none" stroke="#27272A" strokeWidth="1.8" />
          <circle cx="39" cy="34" r="5" fill="none" stroke="#27272A" strokeWidth="1.8" />
          <path d="M30 34h4" stroke="#27272A" strokeWidth="1.8" />
          <path
            d="M27 43c2 1.8 8 1.8 10 0"
            fill="none"
            stroke="#3F3F46"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </FaceBase>
      );
    case "beard":
      return (
        <FaceBase className={className} skin="#E8C9A8">
          <path
            d="M17 27c5-11 25-11 30 0-2 2-8 3-15 3s-13-1-15-3z"
            fill="#3F2A1D"
          />
          <circle cx="25" cy="33" r="1.5" fill="#3F3F46" />
          <circle cx="39" cy="33" r="1.5" fill="#3F3F46" />
          <path
            d="M22 42c2 8 18 8 20 0-1 1-5 3-10 3s-9-2-10-3z"
            fill="#5B4636"
          />
          <path
            d="M28 40c1.5 1.2 6.5 1.2 8 0"
            fill="none"
            stroke="#3F3F46"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </FaceBase>
      );
    case "bob":
      return (
        <FaceBase className={className} skin="#F6DCC4">
          <path
            d="M14 30c2-14 34-14 36 0v10c-3 1-7-1-10-2-2 4-14 4-16 0-3 1-7 3-10 2V30z"
            fill="#7C2D12"
          />
          <circle cx="25" cy="34" r="1.5" fill="#3F3F46" />
          <circle cx="39" cy="34" r="1.5" fill="#3F3F46" />
          <path
            d="M28 42c1.8 2 6.2 2 8 0"
            fill="none"
            stroke="#BE123C"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </FaceBase>
      );
    case "cap":
      return (
        <FaceBase className={className} skin="#F0D2B4">
          <path
            d="M14 28c3-10 33-10 36 0-6 2-12 3-18 3s-12-1-18-3z"
            fill="#1D4ED8"
          />
          <path d="M12 28h40v3H12z" fill="#1E3A8A" />
          <circle cx="25" cy="35" r="1.5" fill="#3F3F46" />
          <circle cx="39" cy="35" r="1.5" fill="#3F3F46" />
          <path
            d="M28 43c1.8 1.6 6.2 1.6 8 0"
            fill="none"
            stroke="#3F3F46"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </FaceBase>
      );
    case "circle":
    default:
      return (
        <FaceBase className={className}>
          <path
            d="M18 28c3-9 25-9 28 0"
            fill="none"
            stroke="#52525B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="25" cy="34" r="1.7" fill="#3F3F46" />
          <circle cx="39" cy="34" r="1.7" fill="#3F3F46" />
          <path
            d="M27 43c2.2 2.2 7.8 2.2 10 0"
            fill="none"
            stroke="#3F3F46"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </FaceBase>
      );
  }
}
