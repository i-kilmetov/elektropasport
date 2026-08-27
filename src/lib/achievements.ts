import {
  BookOpen,
  GraduationCap,
  HousePlug,
  Medal,
  ScrollText,
  Users,
  Wrench,
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

export function listAchievements(input: {
  panelCount: number;
  applianceCount: number;
  inviteCount: number;
  school?: SchoolProgress;
  masterApplied?: boolean;
}): Achievement[] {
  const school = input.school ?? (typeof window === "undefined"
    ? undefined
    : readSchoolProgress());
  const g1 = school ? gradeCompleted(school, 1) : false;
  const g2 = school ? gradeCompleted(school, 2) : false;
  const g3 = school ? gradeCompleted(school, 3) : false;
  const masterApplied = input.masterApplied ?? readMasterApplied();

  return [
    {
      id: "first-panel",
      title: "Первый щиток",
      hint: "Добавили щиток в паспорт",
      unlocked: input.panelCount >= 1,
      icon: Zap,
    },
    {
      id: "first-appliance",
      title: "Техника дома",
      hint: "Привязали прибор к щитку",
      unlocked: input.applianceCount >= 1,
      icon: HousePlug,
    },
    {
      id: "invite-1",
      title: "Друг в Токоме",
      hint: "Пригласили одного пользователя",
      unlocked: input.inviteCount >= 1,
      icon: Users,
    },
    {
      id: "invite-3",
      title: "Команда",
      hint: "Трое приглашённых",
      unlocked: input.inviteCount >= 3,
      icon: Medal,
    },
    {
      id: "grade-1",
      title: "1 класс",
      hint: "Окончили первый класс школы",
      unlocked: g1,
      icon: BookOpen,
    },
    {
      id: "grade-2",
      title: "2 класс",
      hint: "Окончили второй класс школы",
      unlocked: g2,
      icon: BookOpen,
    },
    {
      id: "grade-3",
      title: "3 класс",
      hint: "Окончили третий класс школы",
      unlocked: g3,
      icon: GraduationCap,
    },
    {
      id: "diploma",
      title: "Диплом Током",
      hint: "Все три класса школы",
      unlocked: g1 && g2 && g3,
      icon: ScrollText,
    },
    {
      id: "master-apply",
      title: "Стать мастером",
      hint: "Отправили заявку специалисту",
      unlocked: masterApplied,
      icon: Wrench,
    },
  ];
}
