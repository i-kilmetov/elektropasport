"use client";

import { useMemo, useState } from "react";
import { Clock, GraduationCap, Lock } from "lucide-react";
import {
  MASTER_YELLOW_BTN,
  MasterApplyFrame,
} from "@/components/master-apply/master-apply-frame";
import { QuizFlow, type QuizFinish } from "@/components/school/quiz-flow";
import { Button } from "@/components/ui/button";
import { getGrade } from "@/lib/school";
import {
  examLockUntil,
  gradeCompleted,
  readSchoolProgress,
  recordExam,
  writeSchoolProgress,
} from "@/lib/school/progress";
import {
  CHOICE_SECONDS,
  daysHoursLeft,
  WRITTEN_SECONDS,
} from "@/lib/school/quiz";

export type MasterExamResult = {
  score: number;
  total: number;
  grade: 3 | 4 | 5;
};

export function MasterExamScreen({
  onBack,
  onPassed,
}: {
  onBack: () => void;
  onPassed: (result: MasterExamResult) => void;
}) {
  const [progress, setProgress] = useState(() => readSchoolProgress());
  const [started, setStarted] = useState(false);

  const alreadyPassed = gradeCompleted(progress, 3);
  const lockUntil = examLockUntil(progress, 3);
  const best = progress.grades[3].examBest;
  const questions = useMemo(() => getGrade(3).exam, []);

  const continueWithBest = () => {
    if (!best || best.grade < 3) return;
    onPassed({
      score: best.score,
      total: best.total,
      grade: best.grade as 3 | 4 | 5,
    });
  };

  if (alreadyPassed && best) {
    return (
      <MasterApplyFrame
        onBack={onBack}
        title="Тестирование"
        footer={
          <Button
            className={`w-full ${MASTER_YELLOW_BTN}`}
            size="lg"
            onClick={continueWithBest}
          >
            Продолжить заявку
          </Button>
        }
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#D3DA00] text-[#111113]">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-[26px] font-bold tracking-tight text-white">
          Экзамен уже сдан
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Вы окончили 3 класс школы Током — оценка {best.grade} ({best.score} из{" "}
          {best.total}). Повторно сдавать тест для заявки не нужно.
        </p>
      </MasterApplyFrame>
    );
  }

  if (lockUntil) {
    return (
      <MasterApplyFrame
        onBack={onBack}
        title="Тестирование"
        footer={
          <Button
            className="w-full border-white/10 bg-white/8 text-white hover:bg-white/12"
            variant="secondary"
            size="lg"
            onClick={onBack}
          >
            Назад
          </Button>
        }
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/8 text-white/70">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-[26px] font-bold tracking-tight text-white">
          Пока рано
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Тест 3 класса не сдан. Следующая попытка — через{" "}
          {daysHoursLeft(lockUntil)}. Это отсекает случайные заявки и даёт время
          подготовиться.
        </p>
      </MasterApplyFrame>
    );
  }

  if (!started) {
    return (
      <MasterApplyFrame
        onBack={onBack}
        title="Тестирование"
        footer={
          <Button
            className={`w-full ${MASTER_YELLOW_BTN}`}
            size="lg"
            onClick={() => setStarted(true)}
          >
            Начать экзамен
          </Button>
        }
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#D3DA00]/15 text-[#D3DA00]">
          <Clock className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-[26px] font-bold tracking-tight text-white">
          Экзамен 3 класса
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Это тот же экзамен, что в школе Током. Нужно отсечь заявки без
          подготовки: зачёт — оценка не ниже 3 (10 верных из 20).
        </p>
        <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-white/50">
          <li>• На вопрос с вариантами — не больше {CHOICE_SECONDS} секунд</li>
          <li>• На письменный ответ — не больше {WRITTEN_SECONDS} секунд</li>
          <li>• Если время вышло, ответ не засчитывается</li>
          <li>• Несдача — следующая попытка не раньше чем через неделю</li>
        </ul>
      </MasterApplyFrame>
    );
  }

  return (
    <MasterApplyFrame onBack={onBack} title="Экзамен 3 класса" bodyClassName="overflow-hidden">
      <QuizFlow
        mode="exam"
        tone="dark"
        title="Экзамен 3 класса"
        questions={questions}
        onExit={onBack}
        onFinish={(result: QuizFinish) => {
          const grade = result.grade ?? 2;
          const next = recordExam(readSchoolProgress(), 3, {
            score: result.score,
            total: result.total,
            grade,
            at: Date.now(),
          });
          writeSchoolProgress(next);
          if (result.passed && result.grade && result.grade >= 3) {
            onPassed({
              score: result.score,
              total: result.total,
              grade: result.grade as 3 | 4 | 5,
            });
            return;
          }
          setProgress(next);
          setStarted(false);
        }}
      />
    </MasterApplyFrame>
  );
}
