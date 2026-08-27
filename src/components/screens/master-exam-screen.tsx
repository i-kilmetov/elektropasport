"use client";

import { useMemo, useState } from "react";
import { Clock, GraduationCap, Lock } from "lucide-react";
import {
  MASTER_YELLOW_BTN,
  MasterApplyFrame,
} from "@/components/master-apply/master-apply-frame";
import { QuizFlow, type QuizFinish } from "@/components/school/quiz-flow";
import { Button } from "@/components/ui/button";
import {
  clearMasterTestAbandon,
  markMasterTestStarted,
  masterTestAbandonLockUntil,
} from "@/lib/master-test";
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
  const [abandonUntil, setAbandonUntil] = useState(() =>
    masterTestAbandonLockUntil(),
  );

  const alreadyPassed = gradeCompleted(progress, 3);
  const failUntil = examLockUntil(progress, 3);
  const lockUntil =
    failUntil && abandonUntil
      ? Math.max(failUntil, abandonUntil)
      : (failUntil ?? abandonUntil);
  const lockedByAbandon = Boolean(
    abandonUntil && (!failUntil || abandonUntil >= failUntil),
  );
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

  const startTest = () => {
    markMasterTestStarted();
    setStarted(true);
  };

  const finishTest = (result: QuizFinish) => {
    clearMasterTestAbandon();
    const grade = result.grade ?? 2;
    const next = recordExam(readSchoolProgress(), 3, {
      score: result.score,
      total: result.total,
      grade,
      at: Date.now(),
    });
    writeSchoolProgress(next);
    setAbandonUntil(null);
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
          Тест уже пройден
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Практические знания уже подтверждены — оценка {best.grade} ({best.score}{" "}
          из {best.total}). Повторно проходить тест для заявки не нужно.
        </p>
      </MasterApplyFrame>
    );
  }

  if (lockUntil && !started) {
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
          {lockedByAbandon
            ? `Вы вышли, не завершив тест. Следующая попытка — через ${daysHoursLeft(lockUntil)}.`
            : `Тест не сдан. Следующая попытка — через ${daysHoursLeft(lockUntil)}.`}
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
            onClick={startTest}
          >
            Начать тест
          </Button>
        }
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#D3DA00]/15 text-[#D3DA00]">
          <Clock className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-[26px] font-bold tracking-tight text-white">
          Проверка знаний
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Дальше будет тест — так мы убедимся в ваших практических знаниях.
        </p>
        <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-white/50">
          <li>• На вопрос с вариантами — не больше {CHOICE_SECONDS} секунд</li>
          <li>• На письменный ответ — не больше {WRITTEN_SECONDS} секунд</li>
          <li>• Если время вышло, ответ не засчитывается</li>
          <li>• Несдача — следующая попытка не раньше чем через неделю</li>
          <li>
            • Если выйти, не завершив тест, заново пройти его можно будет не
            раньше чем через сутки
          </li>
        </ul>
      </MasterApplyFrame>
    );
  }

  return (
    <MasterApplyFrame
      onBack={onBack}
      title="Тестирование"
      bodyClassName="overflow-hidden"
    >
      <QuizFlow
        mode="exam"
        tone="dark"
        title="Тест"
        questions={questions}
        onExit={onBack}
        onFinish={finishTest}
      />
    </MasterApplyFrame>
  );
}
