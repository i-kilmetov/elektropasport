import type { GradeId, SchoolProgress } from "@/lib/school/types";
import {
  canEnterGrade,
  gradeCompleted,
  previousGradeId,
} from "@/lib/school/progress";

const STORAGE_KEY = "elektropasport:school-paid";

export const SCHOOL_GRADE_PRICE_RUB: Record<GradeId, number> = {
  1: 299,
  2: 499,
  3: 999,
  4: 99,
};

function parsePaid(raw: unknown): GradeId[] {
  if (!Array.isArray(raw)) return [];
  const next: GradeId[] = [];
  for (const value of raw) {
    if (value === 1 || value === 2 || value === 3 || value === 4) next.push(value);
  }
  return next;
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

export function markGradePaid(gradeId: GradeId): GradeId[] {
  const next = Array.from(new Set([...readPaidGrades(), gradeId])).sort(
    (a, b) => a - b,
  ) as GradeId[];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode
  }
  return next;
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
