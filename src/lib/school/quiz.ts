import type { ExamGrade, SchoolQuestion } from "@/lib/school/types";

export const EXAM_QUESTION_COUNT = 20;
export const PLACEMENT_QUESTION_COUNT = 10;
export const PLACEMENT_PASS_SCORE = 7;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .replace(/[«»""']/g, "")
    .replace(/[.!?]+$/g, "");
}

function stripUnit(value: string): string {
  return value.replace(
    /\s*(?:мм²|мм2|кв|ма|ma|вт|w|ампер|вольт|ватт|мм|а|a|в|v)\s*$/i,
    "",
  );
}

export function writtenMatches(value: string, accepted: string[]): boolean {
  const got = normalizeAnswer(value);
  if (!got) return false;
  const compact = got.replace(/\s/g, "");
  const gotBare = stripUnit(got).replace(/\s/g, "");
  return accepted.some((item) => {
    const want = normalizeAnswer(item);
    const wantBare = stripUnit(want).replace(/\s/g, "");
    return (
      got === want ||
      compact === want.replace(/\s/g, "") ||
      gotBare === wantBare
    );
  });
}

export function isChoiceCorrect(
  question: Extract<SchoolQuestion, { kind: "single" | "multi" }>,
  selected: string[],
): boolean {
  if (selected.length !== question.correct.length) return false;
  const want = new Set(question.correct);
  return selected.every((id) => want.has(id));
}

export function isQuestionCorrect(
  question: SchoolQuestion,
  answer: string | string[],
): boolean {
  if (question.kind === "written") {
    return typeof answer === "string" && writtenMatches(answer, question.accepted);
  }
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return isChoiceCorrect(question, selected);
}

export function scoreAnswers(
  questions: SchoolQuestion[],
  answers: Record<string, string | string[]>,
): { score: number; total: number } {
  let score = 0;
  for (const question of questions) {
    if (isQuestionCorrect(question, answers[question.id] ?? "")) score += 1;
  }
  return { score, total: questions.length };
}

/** 20 вопросов: 18–20 → 5, 14–17 → 4, 10–13 → 3, иначе 2. */
export function examMark(score: number, total: number): ExamGrade {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  return 2;
}

export function examPassed(grade: ExamGrade): boolean {
  return grade >= 3;
}

export function miniQuizPassed(score: number, total: number): boolean {
  if (total <= 0) return false;
  return score / total >= 0.7;
}

export function pickQuestions(
  bank: SchoolQuestion[],
  ids: string[],
): SchoolQuestion[] {
  const byId = new Map(bank.map((question) => [question.id, question]));
  return ids
    .map((id) => byId.get(id))
    .filter((question): question is SchoolQuestion => Boolean(question));
}

export function formatLockUntil(until: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(until);
}

export function daysHoursLeft(until: number): string {
  const ms = Math.max(0, until - Date.now());
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) {
    return hours > 0 ? `${days} дн. ${hours} ч.` : `${days} дн.`;
  }
  if (hours >= 1) return `${hours} ч.`;
  const minutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
  return `${minutes} мин.`;
}
