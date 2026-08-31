import type { GradeId, SchoolProgress } from "@/lib/school/types";
import {
  canEnterGrade,
  gradeCompleted,
  previousGradeId,
} from "@/lib/school/progress";

const STORAGE_KEY = "elektropasport:school-paid";
const SCHOOL_SERVICE_PREFIX = "school:";

export const SCHOOL_GRADE_PRICE_RUB: Record<GradeId, number> = {
  1: 500,
  2: 1000,
  3: 2000,
  4: 200,
};

export const SCHOOL_GRADE_PAYMENT_TITLE: Record<GradeId, string> = {
  1: "1 класс",
  2: "2 класс",
  3: "3 класс",
  4: "Продленка",
};

export function isGradeId(value: unknown): value is GradeId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function schoolServiceType(gradeId: GradeId): string {
  return `${SCHOOL_SERVICE_PREFIX}${gradeId}`;
}

export function parseSchoolGradeId(serviceType: string): GradeId | null {
  if (!serviceType.startsWith(SCHOOL_SERVICE_PREFIX)) return null;
  const n = Number(serviceType.slice(SCHOOL_SERVICE_PREFIX.length));
  return isGradeId(n) ? n : null;
}

export function parsePaid(raw: unknown): GradeId[] {
  if (typeof raw === "string") {
    try {
      return parsePaid(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const next: GradeId[] = [];
  for (const value of raw) {
    const n = typeof value === "string" ? Number(value) : value;
    if (isGradeId(n) && !next.includes(n)) next.push(n);
  }
  return next.sort((a, b) => a - b) as GradeId[];
}

export function readPaidGrades(): GradeId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parsePaid(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function isGradePaid(gradeId: GradeId, paid = readPaidGrades()): boolean {
  return paid.includes(gradeId);
}

export function writePaidGrades(grades: GradeId[]): GradeId[] {
  const next = parsePaid(grades);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode
  }
  return next;
}

export function markGradePaid(gradeId: GradeId): GradeId[] {
  return writePaidGrades([...readPaidGrades(), gradeId]);
}

export function canPurchaseGrade(
  progress: SchoolProgress,
  gradeId: GradeId,
  paid = readPaidGrades(),
): boolean {
  if (isGradePaid(gradeId, paid)) return false;
  if (gradeId === 1) return true;
  const prev = previousGradeId(gradeId);
  return Boolean(prev && gradeCompleted(progress, prev));
}

export function canStudyGrade(
  progress: SchoolProgress,
  gradeId: GradeId,
  paid = readPaidGrades(),
): boolean {
  return isGradePaid(gradeId, paid) && canEnterGrade(progress, gradeId);
}
