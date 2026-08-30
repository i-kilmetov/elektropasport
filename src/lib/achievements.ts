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
  /** IEC / GOST multi-core wire colour for the ribbon. */
  ribbon: "pe" | "brown" | "black" | "grey" | "blue";
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

function literacyTitle(level: number): string {
  const degree = Math.min(Math.max(level, 1), 3);
  return `За победу над неграмотностью ${degree} степени`;
}

function literacyHint(level: number): string {
  if (level >= 3) return "Все три класса школы пройдены.";
  if (level === 2) return "2 степень. Остался выпускной класс.";
  if (level === 1) return "1 степень. Окончен первый класс школы.";
  return "Окончить классы школы электрики — 1, 2 и 3 степень.";
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
      ribbon: "pe",
    },
    {
      id: "first-appliance",
      title: "За технику",
      hint: input.applianceCount >= 1
        ? "Техника привязана к щитку."
        : "Добавить технику к щитку.",
      unlocked: input.applianceCount >= 1,
      icon: HousePlug,
      ribbon: "brown",
    },
    {
      id: "invite-1",
      title: "За бойца",
      hint: input.inviteCount >= 1
        ? "В Токоме появился новый боец."
        : "Пригласить одного пользователя в Током.",
      unlocked: input.inviteCount >= 1,
      icon: UserPlus,
      ribbon: "black",
    },
    {
      id: "invite-3",
      title: "За роту",
      hint: input.inviteCount >= 3
        ? "В Токоме целая рота — трое приглашённых."
        : input.inviteCount > 0
          ? `Сейчас ${input.inviteCount} из 3. Нужна целая рота.`
          : "Собрать роту: минимум трое приглашённых.",
      unlocked: input.inviteCount >= 3,
      icon: Users,
      ribbon: "grey",
    },
    {
      id: "literacy",
      title: literacyTitle(literacy),
      hint: literacyHint(literacy),
      unlocked: literacy >= 1,
      icon: GraduationCap,
      level: literacy,
      maxLevel: 3,
      ribbon: "blue",
    },
  ];
}
