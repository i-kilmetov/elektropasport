import {
  GraduationCap,
  HousePlug,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  gradeCompleted,
  readSchoolProgress,
} from "@/lib/school/progress";
import type { SchoolProgress } from "@/lib/school/types";

export const MASTER_APPLIED_KEY = "elektropasport:master-applied";

export type Achievement = {
  id: string;
  title: string;
  hint: string;
  unlocked: boolean;
  icon: LucideIcon;
  /** Filled steps for multi-level medals (literacy). */
  level?: number;
  maxLevel?: number;
};

export function readMasterApplied(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MASTER_APPLIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markMasterApplied(): void {
  try {
    localStorage.setItem(MASTER_APPLIED_KEY, "1");
  } catch {
    // private mode
  }
}

function literacyLevel(school: SchoolProgress | undefined): number {
  if (!school) return 0;
  if (gradeCompleted(school, 3)) return 3;
  if (gradeCompleted(school, 2)) return 2;
  if (gradeCompleted(school, 1)) return 1;
  return 0;
}

export function listAchievements(input: {
  panelCount: number;
  applianceCount: number;
  inviteCount: number;
  school?: SchoolProgress;
}): Achievement[] {
  const school = input.school ?? (typeof window === "undefined"
    ? undefined
    : readSchoolProgress());
  const literacy = literacyLevel(school);

  return [
    {
      id: "first-panel",
      title: "За щиток",
      hint: input.panelCount >= 1
        ? "Щиток добавлен в паспорт."
        : "Добавить щиток в паспорт.",
      unlocked: input.panelCount >= 1,
      icon: Zap,
    },
    {
      id: "first-appliance",
      title: "За технику",
      hint: "Добавь технику к щитку",
      unlocked: input.applianceCount >= 1,
      icon: HousePlug,
    },
    {
      id: "invite-1",
      title: "За бойца",
      hint: "Пригласи пользователя в Током",
      unlocked: input.inviteCount >= 1,
      icon: UserPlus,
    },
    {
      id: "invite-3",
      title: "За роту",
      hint: "Пригласи минимум троих человек в сервис",
      unlocked: input.inviteCount >= 3,
      icon: Users,
    },
    {
      id: "literacy",
      title: "За победу над неграмотностью",
      hint: "За каждый класс в школе Током.",
      unlocked: literacy >= 1,
      icon: GraduationCap,
      level: literacy,
      maxLevel: 3,
    },
  ];
}
