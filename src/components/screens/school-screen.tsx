"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  GraduationCap,
  Lock,
  Sparkles,
} from "lucide-react";
import { LessonBlocks } from "@/components/school/lesson-blocks";
import { QuizFlow, type QuizFinish } from "@/components/school/quiz-flow";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import {
  getGrade,
  getTopic,
  placementQuestions,
  SCHOOL_DISCLAIMER,
  SCHOOL_GRADES,
} from "@/lib/school";
import {
  allTopicsPassed,
  canEnterGrade,
  gradeCompleted,
  markTopicPassed,
  needsPlacement,
  placementLockUntil,
  readSchoolProgress,
  recordExam,
  recordPlacement,
  topicsPassedCount,
  writeSchoolProgress,
} from "@/lib/school/progress";
import { daysHoursLeft, examPassed } from "@/lib/school/quiz";
import type { GradeId, SchoolProgress, Topic } from "@/lib/school/types";
import { cn } from "@/lib/utils";

type View =
  | { kind: "home" }
  | { kind: "grade"; gradeId: GradeId }
  | { kind: "lesson"; gradeId: GradeId; topicId: string }
  | { kind: "quiz"; gradeId: GradeId; topicId: string }
  | { kind: "exam"; gradeId: GradeId }
  | { kind: "placement"; gradeId: 2 | 3 };

export function SchoolScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState<SchoolProgress>(() =>
    readSchoolProgress(),
  );
  const [view, setView] = useState<View>({ kind: "home" });

  const persist = (next: SchoolProgress) => {
    writeSchoolProgress(next);
    setProgress(next);
  };

  const goHome = () => setView({ kind: "home" });
  const goGrade = (gradeId: GradeId) => setView({ kind: "grade", gradeId });

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <AnimatePresence mode="wait">
        {view.kind === "home" ? (
          <SchoolHome
            key="home"
            progress={progress}
            onBack={onBack}
            onOpenGrade={goGrade}
            onPlacement={(gradeId) => setView({ kind: "placement", gradeId })}
          />
        ) : null}
        {view.kind === "grade" ? (
          <GradeProgram
            key={`grade-${view.gradeId}`}
            gradeId={view.gradeId}
            progress={progress}
            onBack={goHome}
            onOpenTopic={(topicId) =>
              setView({ kind: "lesson", gradeId: view.gradeId, topicId })
            }
            onExam={() => setView({ kind: "exam", gradeId: view.gradeId })}
            onPlacement={() =>
              setView({ kind: "placement", gradeId: view.gradeId as 2 | 3 })
            }
          />
        ) : null}
        {view.kind === "lesson" ? (
          <TopicLesson
            key={`lesson-${view.topicId}`}
            gradeId={view.gradeId}
            topicId={view.topicId}
            passed={Boolean(progress.grades[view.gradeId].topicPassed[view.topicId])}
            onBack={() => goGrade(view.gradeId)}
            onStartQuiz={() =>
              setView({ kind: "quiz", gradeId: view.gradeId, topicId: view.topicId })
            }
          />
        ) : null}
        {view.kind === "quiz" ? (
          <QuizGate
            key={`quiz-${view.topicId}`}
            title="Мини-тест"
            mode="mini"
            questions={getTopic(view.gradeId, view.topicId)?.quiz ?? []}
            onExit={() =>
              setView({ kind: "lesson", gradeId: view.gradeId, topicId: view.topicId })
            }
            onFinish={(result) => {
              if (result.passed) {
                persist(markTopicPassed(progress, view.gradeId, view.topicId));
              }
              goGrade(view.gradeId);
            }}
          />
        ) : null}
        {view.kind === "exam" ? (
          <QuizGate
            key={`exam-${view.gradeId}`}
            title="Экзамен"
            mode="exam"
            questions={getGrade(view.gradeId).exam}
            onExit={() => goGrade(view.gradeId)}
            onFinish={(result) => {
              if (result.grade) {
                persist(
                  recordExam(progress, view.gradeId, {
                    score: result.score,
                    total: result.total,
                    grade: result.grade,
                    at: Date.now(),
                  }),
                );
              }
              goGrade(view.gradeId);
            }}
          />
        ) : null}
        {view.kind === "placement" ? (
          <QuizGate
            key={`place-${view.gradeId}`}
            title="Входной тест"
            mode="placement"
            questions={placementQuestions(view.gradeId)}
            onExit={goHome}
            onFinish={(result) => {
              persist(recordPlacement(progress, view.gradeId, result.passed));
              if (result.passed) goGrade(view.gradeId);
              else goHome();
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function SchoolHeader({
  title,
  onBack,
  subtitle,
}: {
  title: string;
  onBack: () => void;
  subtitle?: string;
}) {
  return (
    <header className="mb-5 flex shrink-0 items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
        aria-label="Назад"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold leading-tight text-zinc-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}

function SchoolHome({
  progress,
  onBack,
  onOpenGrade,
  onPlacement,
}: {
  progress: SchoolProgress;
  onBack: () => void;
  onOpenGrade: (gradeId: GradeId) => void;
  onPlacement: (gradeId: 2 | 3) => void;
}) {
  const finished = SCHOOL_GRADES.filter((grade) =>
    gradeCompleted(progress, grade.id),
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SchoolHeader title="Школа Током" onBack={onBack} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/empty-states/school.png"
          alt="Класс Школы Током"
          width={921}
          height={1006}
          draggable={false}
          className="pointer-events-none mx-auto h-[min(26dvh,168px)] w-auto max-w-full select-none object-contain"
        />

        <div>
          <p className="text-[16px] leading-relaxed text-zinc-700">
            Три класса — от розетки до сборки щитка. Короткие уроки, живые
            примеры, схемы и экзамен с оценкой.
          </p>
          <p className="mt-2 text-[13px] text-zinc-500">
            Закрыто классов: {finished} из 3
          </p>
        </div>

        {finished === 3 ? (
          <GlassCard className="bg-[#D3DA00]/25 p-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
              <Sparkles className="h-4 w-4" />
              Диплом школы
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-zinc-700">
              Вы прошли путь от «что такое ватт» до самостоятельной сборки
              щитка. Это уже серьёзный уровень для дома.
            </p>
          </GlassCard>
        ) : null}

        <div className="space-y-3">
          {SCHOOL_GRADES.map((grade) => (
            <GradeCard
              key={grade.id}
              gradeId={grade.id}
              progress={progress}
              onOpen={() => onOpenGrade(grade.id)}
              onPlacement={() => onPlacement(grade.id as 2 | 3)}
            />
          ))}
        </div>

        <p className="text-[12px] leading-relaxed text-zinc-400">
          {SCHOOL_DISCLAIMER}
        </p>
      </div>
    </motion.div>
  );
}

function GradeCard({
  gradeId,
  progress,
  onOpen,
  onPlacement,
}: {
  gradeId: GradeId;
  progress: SchoolProgress;
  onOpen: () => void;
  onPlacement: () => void;
}) {
  const grade = getGrade(gradeId);
  const open = canEnterGrade(progress, gradeId);
  const lockUntil = placementLockUntil(progress, gradeId);
  const needTest = needsPlacement(progress, gradeId);
  const best = progress.grades[gradeId].examBest;
  const passedTopics = topicsPassedCount(
    progress,
    gradeId,
    grade.topics.map((topic) => topic.id),
  );
  const topicTotal = grade.topics.length;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] text-[18px] font-bold"
          style={{
            background: grade.id === 3 ? "#111113" : grade.accent,
            color: grade.id === 3 ? "#D3DA00" : "#111113",
          }}
        >
          {grade.id}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-zinc-900">
              {grade.title}
            </h2>
            {best && examPassed(best.grade) ? (
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                {best.grade}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">
            {grade.subtitle}
          </p>
          {open ? (
            <p className="mt-2 text-[12px] text-zinc-400">
              Темы {passedTopics} / {topicTotal}
              {best ? ` · экзамен ${best.grade}` : ""}
            </p>
          ) : lockUntil ? (
            <p className="mt-2 flex items-center gap-1 text-[12px] text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Повтор входного теста через {daysHoursLeft(lockUntil)}
            </p>
          ) : (
            <p className="mt-2 flex items-center gap-1 text-[12px] text-zinc-500">
              <Lock className="h-3.5 w-3.5" />
              Сначала тест из экзамена предыдущего класса
            </p>
          )}
        </div>
      </div>
      <Button
        className="mt-4 w-full"
        size="sm"
        variant={open ? "default" : "secondary"}
        disabled={Boolean(!open && lockUntil)}
        onClick={() => {
          if (open) onOpen();
          else if (!lockUntil && needTest) onPlacement();
        }}
      >
        {open
          ? passedTopics > 0 || best
            ? "Продолжить"
            : "Поступить"
          : lockUntil
            ? "Пока закрыто"
            : "Пройти входной тест"}
      </Button>
    </GlassCard>
  );
}

function GradeProgram({
  gradeId,
  progress,
  onBack,
  onOpenTopic,
  onExam,
  onPlacement,
}: {
  gradeId: GradeId;
  progress: SchoolProgress;
  onBack: () => void;
  onOpenTopic: (topicId: string) => void;
  onExam: () => void;
  onPlacement: () => void;
}) {
  const grade = getGrade(gradeId);
  const open = canEnterGrade(progress, gradeId);
  const lockUntil = placementLockUntil(progress, gradeId);
  const topicIds = grade.topics.map((topic) => topic.id);
  const passedCount = topicsPassedCount(progress, gradeId, topicIds);
  const readyForExam = allTopicsPassed(progress, gradeId, topicIds);
  const best = progress.grades[gradeId].examBest;
  const percent = Math.round((passedCount / topicIds.length) * 100);

  if (!open) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SchoolHeader title={grade.title} onBack={onBack} />
        <GlassCard className="p-5 text-center">
          <Lock className="mx-auto h-8 w-8 text-zinc-400" />
          <h2 className="mt-3 text-[18px] font-semibold text-zinc-900">
            Сначала входной тест
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
            10 вопросов из экзамена предыдущего класса. Нужно 7 верных. Если не
            получится — следующая попытка через неделю.
          </p>
          {lockUntil ? (
            <p className="mt-3 text-[13px] text-amber-700">
              Можно снова через {daysHoursLeft(lockUntil)}
            </p>
          ) : (
            <Button className="mt-5 w-full" onClick={onPlacement}>
              Начать тест
            </Button>
          )}
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SchoolHeader
        title={grade.title}
        subtitle={grade.shortTitle}
        onBack={onBack}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <p className="text-[15px] leading-relaxed text-zinc-600">
          {grade.promise}
        </p>
        <div>
          <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
            <span>Программа</span>
            <span>
              {passedCount} / {topicIds.length} тем
            </span>
          </div>
          <Progress value={percent} indicatorClassName="bg-[#D3DA00]" />
        </div>

        <div className="space-y-2">
          {grade.topics.map((topic, index) => {
            const done = Boolean(progress.grades[gradeId].topicPassed[topic.id]);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => onOpenTopic(topic.id)}
                className="w-full text-left"
              >
                <GlassCard className="flex items-center gap-3 p-3.5 transition-colors hover:bg-zinc-50">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[13px] font-semibold",
                      done
                        ? "bg-[#D3DA00] text-zinc-900"
                        : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-zinc-900">
                      {topic.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-zinc-500">
                      {topic.minutes} мин · {topic.teaser}
                    </span>
                  </span>
                  <BookOpen className="h-4 w-4 shrink-0 text-zinc-300" />
                </GlassCard>
              </button>
            );
          })}
        </div>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
            <GraduationCap className="h-4 w-4" />
            Экзамен
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
            20 вопросов: 16 с вариантами (иногда несколько верных) и 4
            письменных. Оценка от 2 до 5. Для зачёта нужно не меньше 10 верных.
          </p>
          {best ? (
            <p className="mt-2 text-[13px] text-zinc-700">
              Лучшая оценка: <strong>{best.grade}</strong> ({best.score} из{" "}
              {best.total})
              {progress.grades[gradeId].examAttempts > 1
                ? ` · попыток ${progress.grades[gradeId].examAttempts}`
                : ""}
            </p>
          ) : null}
          <Button
            className="mt-4 w-full"
            size="sm"
            disabled={!readyForExam}
            onClick={onExam}
          >
            {readyForExam
              ? best
                ? "Пересдать экзамен"
                : "Сдать экзамен"
              : "Сначала закройте все темы"}
          </Button>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function TopicLesson({
  gradeId,
  topicId,
  passed,
  onBack,
  onStartQuiz,
}: {
  gradeId: GradeId;
  topicId: string;
  passed: boolean;
  onBack: () => void;
  onStartQuiz: () => void;
}) {
  const topic = getTopic(gradeId, topicId) as Topic | undefined;
  if (!topic) {
    return (
      <div>
        <SchoolHeader title="Тема не найдена" onBack={onBack} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SchoolHeader title={topic.title} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <p className="mb-4 text-[14px] leading-relaxed text-zinc-500">
          {topic.teaser}
        </p>
        <LessonBlocks blocks={topic.blocks} />
      </div>
      <Button className="mt-2 w-full" onClick={onStartQuiz}>
        {passed ? "Ещё раз мини-тест" : "Мини-тест по теме"}
      </Button>
    </motion.div>
  );
}

function QuizGate({
  title,
  mode,
  questions,
  onExit,
  onFinish,
}: {
  title: string;
  mode: "mini" | "exam" | "placement";
  questions: ReturnType<typeof placementQuestions>;
  onExit: () => void;
  onFinish: (result: QuizFinish) => void;
}) {
  const intro = useMemo(() => {
    if (mode === "exam") {
      return "20 вопросов без подсказок по ходу. В конце — оценка и разбор.";
    }
    if (mode === "placement") {
      return "10 вопросов из экзамена предыдущего класса. Нужно 7 верных. Неудача — пауза на неделю.";
    }
    return "Короткий зачёт по теме. После каждого вопроса сразу разбор.";
  }, [mode]);

  const [started, setStarted] = useState(false);

  if (questions.length === 0) {
    return (
      <div>
        <SchoolHeader title={title} onBack={onExit} />
        <p className="text-zinc-500">Вопросы не найдены.</p>
      </div>
    );
  }

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SchoolHeader title={title} onBack={onExit} />
        <GlassCard className="p-5">
          <p className="text-[15px] leading-relaxed text-zinc-700">{intro}</p>
          <p className="mt-3 text-[13px] text-zinc-500">
            Вопросов: {questions.length}
          </p>
        </GlassCard>
        <Button className="mt-5 w-full" onClick={() => setStarted(true)}>
          Начать
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <SchoolHeader title={title} onBack={onExit} />
      <QuizFlow
        mode={mode}
        title={title}
        questions={questions}
        onExit={onExit}
        onFinish={onFinish}
      />
    </motion.div>
  );
}
