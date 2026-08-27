import type { GradeId, SchoolGrade, SchoolQuestion, Topic } from "@/lib/school/types";
import { grade1 } from "@/lib/school/grade-1";
import { grade2 } from "@/lib/school/grade-2";
import { grade3 } from "@/lib/school/grade-3";
import { pickQuestions } from "@/lib/school/quiz";

export const SCHOOL_GRADES: SchoolGrade[] = [grade1, grade2, grade3];

export function getGrade(id: GradeId): SchoolGrade {
  const grade = SCHOOL_GRADES.find((item) => item.id === id);
  if (!grade) throw new Error(`Unknown grade ${id}`);
  return grade;
}

export function getTopic(gradeId: GradeId, topicId: string): Topic | undefined {
  return getGrade(gradeId).topics.find((topic) => topic.id === topicId);
}

export function placementQuestions(intoGrade: 2 | 3): SchoolQuestion[] {
  const from = getGrade((intoGrade - 1) as GradeId);
  return pickQuestions(from.exam, from.placementForNext);
}

export const SCHOOL_DISCLAIMER =
  "Школа Током — учебный курс. Он не заменяет нормы, проект и допуск электрика. Любые работы — только на обесточенной линии. Ввод, стояк и щит под напряжением — зона специалиста.";
