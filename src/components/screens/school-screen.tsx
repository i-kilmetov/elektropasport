"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  GraduationCap,
  Lock,
} from "lucide-react";
import { LessonBlocks } from "@/components/school/lesson-blocks";
import {
  AdultAgeIcon,
  BabyAgeIcon,
  TeenAgeIcon,
} from "@/components/school/grade-age-icons";
import { QuizFlow, type QuizFinish } from "@/components/school/quiz-flow";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import {
  getGrade,
  getTopic,
  SCHOOL_DISCLAIMER,
  SCHOOL_GRADES,
} from "@/lib/school";
import {
  allTopicsPassed,
  canEnterGrade,
  examLockUntil,
  gradeCompleted,
  markTopicPassed,
  previousGradeId,
  readSchoolProgress,
  recordExam,
  topicsPassedCount,
  writeSchoolProgress,
} from "@/lib/school/progress";
import {
  CHOICE_SECONDS,
  daysHoursLeft,
  examPassed,
  WRITTEN_SECONDS,
} from "@/lib/school/quiz";
import type { GradeId, SchoolProgress, SchoolQuestion, Topic } from "@/lib/school/types";
import { cn } from "@/lib/utils";

type View =
  | { kind: "home" }
  | { kind: "grade"; gradeId: GradeId }
  | { kind: "lesson"; gradeId: GradeId; topicId: string }
  | { kind: "quiz"; gradeId: GradeId; topicId: string }
  | { kind: "exam"; gradeId: GradeId };

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
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <AnimatePresence mode="wait">
        {view.kind === "home" ? (
          <SchoolHome
            key="home"
            progress={progress}
            onBack={onBack}
            onOpenGrade={goGrade}
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
    <header className="mb-3 flex shrink-0 items-center gap-3">
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
}: {
  progress: SchoolProgress;
  onBack: () => void;
  onOpenGrade: (gradeId: GradeId) => void;
}) {
  const finished = SCHOOL_GRADES.filter((grade) =>
    gradeCompleted(progress, grade.id),
  ).length;
  const [expandedId, setExpandedId] = useState<GradeId>(() => {
    const next = SCHOOL_GRADES.find((grade) => !gradeCompleted(progress, grade.id));
    return next?.id ?? 1;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <SchoolHeader title="Школа Током" onBack={onBack} />

      <div className="flex min-h-0 flex-[1.15] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/empty-states/school.png"
          alt="Класс Школы Током"
          width={921}
          height={1006}
          draggable={false}
          className="pointer-events-none h-full max-h-[min(40dvh,280px)] w-auto max-w-full select-none object-contain lg:max-h-[min(48dvh,380px)]"
        />
      </div>

      <div className="mt-2 shrink-0">
        <p className="text-[15px] leading-snug text-zinc-700">
          Три класса — от розетки до сборки щитка.
        </p>
        <p className="mt-1 text-[13px] text-zinc-500">
          {finished === 3
            ? "Диплом школы получен"
            : `Закрыто классов: ${finished} из 3`}
        </p>
      </div>

      <div className="mt-3 flex min-h-[200px] flex-1 overflow-hidden rounded-[24px] border border-black/8 bg-white">
        {SCHOOL_GRADES.map((grade, index) => (
          <GradePane
            key={grade.id}
            gradeId={grade.id}
            progress={progress}
            expanded={expandedId === grade.id}
            showDivider={index > 0}
            onExpand={() => setExpandedId(grade.id)}
            onOpen={() => onOpenGrade(grade.id)}
          />
        ))}
      </div>

      <p className="mt-2 line-clamp-2 shrink-0 text-[11px] leading-snug text-zinc-400">
        {SCHOOL_DISCLAIMER}
      </p>
    </motion.div>
  );
}

const GRADE_AGE_ICONS = {
  1: BabyAgeIcon,
  2: TeenAgeIcon,
  3: AdultAgeIcon,
} as const;

function GradeAgeMark({
  gradeId,
  className,
}: {
  gradeId: GradeId;
  className?: string;
}) {
  const Icon = GRADE_AGE_ICONS[gradeId];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[16px] border border-black/8 bg-white text-zinc-900",
        className,
      )}
    >
      <Icon className="h-[55%] w-[55%]" />
    </span>
  );
}

function GradePane({
  gradeId,
  progress,
  expanded,
  showDivider,
  onExpand,
  onOpen,
}: {
  gradeId: GradeId;
  progress: SchoolProgress;
  expanded: boolean;
  showDivider: boolean;
  onExpand: () => void;
  onOpen: () => void;
}) {
  const grade = getGrade(gradeId);
  const open = canEnterGrade(progress, gradeId);
  const prev = previousGradeId(gradeId);
  const best = progress.grades[gradeId].examBest;
  const passedTopics = topicsPassedCount(
    progress,
    gradeId,
    grade.topics.map((topic) => topic.id),
  );
  const topicTotal = grade.topics.length;

  return (
    <>
      {showDivider ? <div className="w-px shrink-0 self-stretch bg-black/8" /> : null}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white"
        style={{ flex: expanded ? 2 : 0.5 }}
      >
        {expanded ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="flex items-start gap-3">
              <GradeAgeMark gradeId={gradeId} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-semibold leading-tight text-zinc-900">
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
              </div>
            </div>
            {open ? (
              <p className="mt-3 text-[12px] text-zinc-400">
                Темы {passedTopics} / {topicTotal}
                {best ? ` · экзамен ${best.grade}` : ""}
              </p>
            ) : (
              <p className="mt-3 flex items-center gap-1 text-[12px] text-zinc-500">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Сначала окончите {prev ? `${prev} класс` : "предыдущий класс"}
              </p>
            )}
            <Button
              className="mt-auto w-full"
              size="sm"
              variant={open ? "default" : "secondary"}
              disabled={!open}
              onClick={() => {
                if (open) onOpen();
              }}
            >
              {open
                ? passedTopics > 0 || best
                  ? "Продолжить"
                  : "Поступить"
                : "Пока закрыто"}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onExpand}
            className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 bg-white px-1 py-3"
            aria-label={grade.title}
          >
            <GradeAgeMark gradeId={gradeId} className="h-11 w-11" />
            <span className="text-center text-[11px] font-semibold leading-tight text-zinc-700">
              {grade.shortTitle}
            </span>
          </button>
        )}
      </motion.div>
    </>
  );
}

function GradeProgram({
  gradeId,
  progress,
  onBack,
  onOpenTopic,
  onExam,
}: {
  gradeId: GradeId;
  progress: SchoolProgress;
  onBack: () => void;
  onOpenTopic: (topicId: string) => void;
  onExam: () => void;
}) {
  const grade = getGrade(gradeId);
  const open = canEnterGrade(progress, gradeId);
  const prev = previousGradeId(gradeId);
  const topicIds = grade.topics.map((topic) => topic.id);
  const passedCount = topicsPassedCount(progress, gradeId, topicIds);
  const readyForExam = allTopicsPassed(progress, gradeId, topicIds);
  const examLock = examLockUntil(progress, gradeId);
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
            Сначала предыдущий класс
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
            Чтобы учиться здесь, нужно окончить{" "}
            {prev ? `${prev} класс` : "предыдущий класс"} — пройти темы и сдать
            экзамен.
          </p>
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
            письменных. На вариант — {CHOICE_SECONDS} с, на письменный —{" "}
            {WRITTEN_SECONDS} с. Оценка от 2 до 5. Для зачёта нужно не меньше 10
            верных. Несдача — следующая попытка через неделю.
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
          {examLock ? (
            <p className="mt-2 text-[13px] text-amber-700">
              Следующая попытка через {daysHoursLeft(examLock)}
            </p>
          ) : null}
          <Button
            className="mt-4 w-full"
            size="sm"
            disabled={!readyForExam || Boolean(examLock)}
            onClick={onExam}
          >
            {examLock
              ? `Повтор через ${daysHoursLeft(examLock)}`
              : readyForExam
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
  mode: "mini" | "exam";
  questions: SchoolQuestion[];
  onExit: () => void;
  onFinish: (result: QuizFinish) => void;
}) {
  const intro = useMemo(() => {
    if (mode === "exam") {
      return `20 вопросов без подсказок по ходу. На вариант — ${CHOICE_SECONDS} с, на письменный — ${WRITTEN_SECONDS} с. В конце — оценка и разбор. Неудача — следующая попытка через неделю.`;
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
