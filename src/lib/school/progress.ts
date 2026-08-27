import type {
  ExamRecord,
  GradeId,
  GradeProgress,
  SchoolProgress,
} from "@/lib/school/types";
import { examPassed, WEEK_MS } from "@/lib/school/quiz";

const STORAGE_KEY = "elektropasport:school-progress";

function emptyGrade(): GradeProgress {
  return { topicPassed: {}, examAttempts: 0 };
}

export function emptyProgress(): SchoolProgress {
  return {
    version: 1,
    grades: {
      1: emptyGrade(),
      2: emptyGrade(),
      3: emptyGrade(),
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function parseGrade(raw: unknown): GradeProgress {
  const src = asRecord(raw);
  const topicPassed: Record<string, boolean> = {};
  const topics = asRecord(src.topicPassed);
  for (const [key, value] of Object.entries(topics)) {
    if (value === true) topicPassed[key] = true;
  }
  const examSrc = asRecord(src.examBest);
  const grade = examSrc.grade;
  const examBest: ExamRecord | undefined =
    typeof examSrc.score === "number" &&
    typeof examSrc.total === "number" &&
    typeof examSrc.at === "number" &&
    (grade === 2 || grade === 3 || grade === 4 || grade === 5)
      ? {
          score: examSrc.score,
          total: examSrc.total,
          grade,
          at: examSrc.at,
        }
      : undefined;
  return {
    topicPassed,
    examBest,
    examAttempts:
      typeof src.examAttempts === "number" && src.examAttempts >= 0
        ? src.examAttempts
        : 0,
    examFailedAt:
      typeof src.examFailedAt === "number" ? src.examFailedAt : undefined,
    placementPassedAt:
      typeof src.placementPassedAt === "number"
        ? src.placementPassedAt
        : undefined,
    placementFailedAt:
      typeof src.placementFailedAt === "number"
        ? src.placementFailedAt
        : undefined,
  };
}

export function parseProgress(raw: unknown): SchoolProgress {
  const src = asRecord(raw);
  const grades = asRecord(src.grades);
  return {
    version: 1,
    grades: {
      1: parseGrade(grades[1] ?? grades["1"]),
      2: parseGrade(grades[2] ?? grades["2"]),
      3: parseGrade(grades[3] ?? grades["3"]),
    },
  };
}

export function readSchoolProgress(): SchoolProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    return parseProgress(JSON.parse(raw) as unknown);
  } catch {
    return emptyProgress();
  }
}

export function writeSchoolProgress(progress: SchoolProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // private mode
  }
}

export function previousGradeId(gradeId: GradeId): GradeId | null {
  if (gradeId === 1) return null;
  return (gradeId - 1) as GradeId;
}

export function gradeCompleted(progress: SchoolProgress, gradeId: GradeId): boolean {
  const best = progress.grades[gradeId].examBest;
  return Boolean(best && examPassed(best.grade));
}

export function examLockUntil(
  progress: SchoolProgress,
  gradeId: GradeId,
): number | null {
  const failedAt = progress.grades[gradeId].examFailedAt;
  if (!failedAt) return null;
  const until = failedAt + WEEK_MS;
  if (Date.now() >= until) return null;
  return until;
}

export function placementLockUntil(
  progress: SchoolProgress,
  gradeId: GradeId,
): number | null {
  if (gradeId === 1) return null;
  const failedAt = progress.grades[gradeId].placementFailedAt;
  if (!failedAt) return null;
  const until = failedAt + WEEK_MS;
  if (Date.now() >= until) return null;
  return until;
}

export function canEnterGrade(
  progress: SchoolProgress,
  gradeId: GradeId,
): boolean {
  if (gradeId === 1) return true;
  const prev = previousGradeId(gradeId);
  if (prev && gradeCompleted(progress, prev)) return true;
  return Boolean(progress.grades[gradeId].placementPassedAt);
}

export function needsPlacement(
  progress: SchoolProgress,
  gradeId: GradeId,
): boolean {
  if (gradeId === 1) return false;
  return !canEnterGrade(progress, gradeId);
}

export function topicsPassedCount(
  progress: SchoolProgress,
  gradeId: GradeId,
  topicIds: string[],
): number {
  const passed = progress.grades[gradeId].topicPassed;
  return topicIds.filter((id) => passed[id]).length;
}

export function allTopicsPassed(
  progress: SchoolProgress,
  gradeId: GradeId,
  topicIds: string[],
): boolean {
  return topicIds.length > 0 && topicsPassedCount(progress, gradeId, topicIds) === topicIds.length;
}

export function markTopicPassed(
  progress: SchoolProgress,
  gradeId: GradeId,
  topicId: string,
): SchoolProgress {
  return {
    ...progress,
    grades: {
      ...progress.grades,
      [gradeId]: {
        ...progress.grades[gradeId],
        topicPassed: {
          ...progress.grades[gradeId].topicPassed,
          [topicId]: true,
        },
      },
    },
  };
}

export function recordExam(
  progress: SchoolProgress,
  gradeId: GradeId,
  record: ExamRecord,
): SchoolProgress {
  const current = progress.grades[gradeId];
  const best =
    !current.examBest || record.grade > current.examBest.grade
      ? record
      : current.examBest;
  const passed = examPassed(record.grade);
  return {
    ...progress,
    grades: {
      ...progress.grades,
      [gradeId]: {
        ...current,
        examBest: best,
        examAttempts: current.examAttempts + 1,
        examFailedAt: passed ? undefined : Date.now(),
      },
    },
  };
}

export function recordPlacement(
  progress: SchoolProgress,
  gradeId: GradeId,
  passed: boolean,
): SchoolProgress {
  const current = progress.grades[gradeId];
  const now = Date.now();
  return {
    ...progress,
    grades: {
      ...progress.grades,
      [gradeId]: {
        ...current,
        placementPassedAt: passed ? now : current.placementPassedAt,
        placementFailedAt: passed ? undefined : now,
      },
    },
  };
}
