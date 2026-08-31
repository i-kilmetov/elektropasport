"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  CircuitBoard,
  GraduationCap,
  Lock,
  Plug,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { LessonBlocks } from "@/components/school/lesson-blocks";
import { SchoolPayScreen, SchoolPaySheet } from "@/components/school/school-pay-flow";
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
  examLockUntil,
  gradeCompleted,
  markTopicPassed,
  previousGradeId,
  readSchoolProgress,
  recordExam,
  topicsPassedCount,
  writeSchoolProgress,
} from "@/lib/school/progress";
import { formatRub } from "@/lib/lead-services";
import {
  canPurchaseGrade,
  canStudyGrade,
  isGradePaid,
  writePaidGrades,
  SCHOOL_GRADE_PRICE_RUB,
} from "@/lib/school/access";
import { canUseServerAuth } from "@/lib/client-auth";
import { fetchSchoolPaidGrades } from "@/lib/user-data";
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
  | { kind: "program" }
  | { kind: "grade"; gradeId: GradeId }
  | { kind: "lesson"; gradeId: GradeId; topicId: string }
  | { kind: "quiz"; gradeId: GradeId; topicId: string }
  | { kind: "exam"; gradeId: GradeId }
  | { kind: "pay"; gradeId: GradeId };

export function SchoolScreen({ onBack }: { onBack: () => void }) {
  const [progress, setProgress] = useState<SchoolProgress>(() =>
    readSchoolProgress(),
  );
  const [view, setView] = useState<View>({ kind: "home" });

  const [paid, setPaid] = useState<GradeId[]>([]);

  useEffect(() => {
    if (!canUseServerAuth()) {
      setPaid([]);
      return;
    }
    const load = () => {
      void fetchSchoolPaidGrades()
        .then((grades) => {
          setPaid(grades);
          writePaidGrades(grades);
        })
        .catch((error: unknown) => {
          console.error(error);
        });
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const persist = (next: SchoolProgress) => {
    writeSchoolProgress(next);
    setProgress(next);
  };

  const goHome = () => setView({ kind: "home" });
  const goProgram = () => setView({ kind: "program" });
  const goGrade = (gradeId: GradeId) => {
    if (!canStudyGrade(progress, gradeId, paid)) return;
    setView({ kind: "grade", gradeId });
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className={cn(
        "flex min-h-0 flex-1 flex-col px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
        view.kind === "home" || view.kind === "program"
          ? "overflow-y-auto"
          : "h-full overflow-hidden",
      )}
    >
      <AnimatePresence mode="wait">
        {view.kind === "home" ? (
          <SchoolHome
            key="home"
            progress={progress}
            onBack={onBack}
            onOpenProgram={goProgram}
          />
        ) : null}
        {view.kind === "program" ? (
          <SchoolProgram
            key="program"
            progress={progress}
            paid={paid}
            onBack={goHome}
            onOpenGrade={goGrade}
            onStartPay={(gradeId) => setView({ kind: "pay", gradeId })}
          />
        ) : null}
        {view.kind === "grade" ? (
          <GradeProgram
            key={`grade-${view.gradeId}`}
            gradeId={view.gradeId}
            progress={progress}
            paid={paid}
            onBack={goProgram}
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
        {view.kind === "pay" && (
          <SchoolPayScreen
            key={`pay-${view.gradeId}`}
            gradeId={view.gradeId}
            onBack={goProgram}
            onPaid={() => {
              const optimistic = writePaidGrades([...paid, view.gradeId]);
              setPaid(optimistic);
              setView({ kind: "grade", gradeId: view.gradeId });
              void fetchSchoolPaidGrades()
                .then((grades) => {
                  const next = writePaidGrades(
                    grades.includes(view.gradeId)
                      ? grades
                      : [...grades, view.gradeId],
                  );
                  setPaid(next);
                })
                .catch((error: unknown) => {
                  console.error(error);
                });
            }}
          />
        )}
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
        <h1 className="ty-title leading-tight text-zinc-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 ty-note">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}

function SchoolHome({
  progress,
  onBack,
  onOpenProgram,
}: {
  progress: SchoolProgress;
  onBack: () => void;
  onOpenProgram: () => void;
}) {
  const finished = SCHOOL_GRADES.filter((grade) =>
    gradeCompleted(progress, grade.id),
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex flex-col pb-4"
    >
      <SchoolHeader title="Школа Током" onBack={onBack} />

      <div className="space-y-5">
        <p className="ty-body">
          Мы сделали электрику еще доступнее: теперь достаточно поступить в
          школу Током, где важные бытовые знания электрики стараемся объяснить
          интересно и доступно каждому.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/empty-states/school.png"
          alt="Класс Школы Током"
          width={921}
          height={1006}
          draggable={false}
          className="pointer-events-none mx-auto h-[min(40dvh,280px)] w-auto max-w-full select-none object-contain lg:h-[min(48dvh,380px)]"
        />

        <div>
          <p className="ty-body">
            Короткие уроки, живые примеры, схемы и экзамен с оценкой. Программа
            обучения с индивидуальным подходом: учитывает вашу схему электрики,
            приборы и технику, которая добавлена в Током. Классы идут по
            порядку: следующий открывается, когда сдан предыдущий. Продлёнка
            доступна после 1 класса.
          </p>
          {finished > 0 ? (
            <p className="mt-2 ty-note">
              {finished === 4
                ? "Все курсы пройдены"
                : gradeCompleted(progress, 1) &&
                    gradeCompleted(progress, 2) &&
                    gradeCompleted(progress, 3)
                  ? "Диплом школы получен"
                  : `Закрыто курсов: ${finished} из ${SCHOOL_GRADES.length}`}
            </p>
          ) : null}
        </div>

        <GlassCard className="p-4">
          <h3 className="ty-heading">
            Обучение платное
          </h3>
          <ul className="mt-3 space-y-2 text-[15px] text-zinc-700">
            {SCHOOL_GRADES.map((grade) => (
              <li key={grade.id} className="flex items-center justify-between gap-3">
                <span>{grade.title}</span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {formatRub(SCHOOL_GRADE_PRICE_RUB[grade.id])}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 ty-note">
            Доступ к оплаченным курсам остаётся: можно возвращаться к урокам в
            любое время.
          </p>
        </GlassCard>

        <Button className="w-full" size="lg" onClick={onOpenProgram}>
          Пойти в школу
        </Button>

        <p className="ty-meta text-zinc-400">
          {SCHOOL_DISCLAIMER}
        </p>
      </div>
    </motion.div>
  );
}

function SchoolProgram({
  progress,
  paid,
  onBack,
  onOpenGrade,
  onStartPay,
}: {
  progress: SchoolProgress;
  paid: GradeId[];
  onBack: () => void;
  onOpenGrade: (gradeId: GradeId) => void;
  onStartPay: (gradeId: GradeId) => void;
}) {
  const [expanded, setExpanded] = useState<Partial<Record<GradeId, boolean>>>(
    () => {
      const next =
        SCHOOL_GRADES.find(
          (grade) =>
            canStudyGrade(progress, grade.id, paid) ||
            canPurchaseGrade(progress, grade.id, paid),
        )?.id ?? 1;
      return { [next]: true };
    },
  );
  const [paySheetGrade, setPaySheetGrade] = useState<GradeId | null>(null);

  const selectGrade = (gradeId: GradeId) => {
    if (canStudyGrade(progress, gradeId, paid)) {
      onOpenGrade(gradeId);
      return;
    }
    if (canPurchaseGrade(progress, gradeId, paid)) {
      setPaySheetGrade(gradeId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex flex-col pb-4"
    >
      <SchoolHeader title="Программа обучения" onBack={onBack} />

      <div className="space-y-3">
        {SCHOOL_GRADES.map((grade) => (
          <GradeAccordion
            key={grade.id}
            gradeId={grade.id}
            progress={progress}
            paid={paid}
            expanded={Boolean(expanded[grade.id])}
            onToggle={() =>
              setExpanded((current) => ({
                ...current,
                [grade.id]: !current[grade.id],
              }))
            }
            onSelect={() => selectGrade(grade.id)}
          />
        ))}
      </div>

      <p className="mt-5 ty-meta text-zinc-400">
        {SCHOOL_DISCLAIMER}
      </p>

      <AnimatePresence>
        {paySheetGrade ? (
          <SchoolPaySheet
            gradeId={paySheetGrade}
            onClose={() => setPaySheetGrade(null)}
            onPay={() => {
              const id = paySheetGrade;
              setPaySheetGrade(null);
              onStartPay(id);
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

const GRADE_ICONS: Record<GradeId, LucideIcon> = {
  1: Plug,
  2: CircuitBoard,
  3: Wrench,
  4: WashingMachine,
};

const GRADE_ICON_TONE: Record<GradeId, string> = {
  1: "bg-[#D3DA00] text-zinc-900",
  2: "bg-zinc-900 text-[#D3DA00]",
  3: "bg-zinc-100 text-zinc-900",
  4: "bg-[#E8EEF9] text-zinc-900",
};

function GradeAgeMark({
  gradeId,
  className,
}: {
  gradeId: GradeId;
  className?: string;
}) {
  const Icon = GRADE_ICONS[gradeId];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[18px]",
        GRADE_ICON_TONE[gradeId],
        className,
      )}
    >
      <Icon className="h-[46%] w-[46%]" strokeWidth={1.75} />
    </span>
  );
}

function GradeAccordion({
  gradeId,
  progress,
  paid,
  expanded,
  onToggle,
  onSelect,
}: {
  gradeId: GradeId;
  progress: SchoolProgress;
  paid: GradeId[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const grade = getGrade(gradeId);
  const purchasable = canPurchaseGrade(progress, gradeId, paid);
  const studying = canStudyGrade(progress, gradeId, paid);
  const prev = previousGradeId(gradeId);
  const best = progress.grades[gradeId].examBest;
  const passedTopics = topicsPassedCount(
    progress,
    gradeId,
    grade.topics.map((topic) => topic.id),
  );

  return (
    <GlassCard className="bg-white p-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
        aria-label={grade.title}
      >
        <GradeAgeMark gradeId={gradeId} className="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="ty-title leading-tight text-zinc-900">
              {grade.title}
            </h3>
            {isGradePaid(gradeId, paid) ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 ty-badge text-emerald-800">
                Оплачен
              </span>
            ) : null}
            {best && examPassed(best.grade) ? (
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 ty-badge text-white">
                {best.grade}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 ty-note">
            {grade.subtitle}
          </p>
          <p className="mt-1 ty-label tabular-nums text-zinc-700">
            {formatRub(SCHOOL_GRADE_PRICE_RUB[gradeId])}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-black/[0.06] px-4 pb-4 pt-3">
              <p className="ty-label text-zinc-600">Программа</p>
              <ol className="space-y-2">
                {grade.topics.map((topic, index) => {
                  const done = Boolean(progress.grades[gradeId].topicPassed[topic.id]);
                  return (
                    <li key={topic.id} className="flex gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ty-badge",
                          done
                            ? "bg-[#D3DA00] text-zinc-900"
                            : "bg-zinc-100 text-zinc-500",
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block ty-subtitle text-zinc-900">
                          {topic.title}
                        </span>
                        <span className="mt-0.5 block ty-meta">
                          {topic.minutes} мин · {topic.teaser}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {studying ? (
                <p className="ty-meta">
                  Темы {passedTopics} / {grade.topics.length}
                  {best ? ` · экзамен ${best.grade}` : ""}
                </p>
              ) : purchasable ? null : (
                <p className="flex items-center gap-1 ty-note">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Сначала окончите {prev ? getGrade(prev).title : "предыдущий класс"}
                </p>
              )}
              <Button
                className="w-full"
                size="sm"
                variant={purchasable || studying ? "default" : "secondary"}
                disabled={!purchasable && !studying}
                onClick={onSelect}
              >
                {studying
                  ? passedTopics > 0 || best
                    ? "Продолжить"
                    : "Поступить"
                  : purchasable
                    ? gradeId === 4
                      ? "Выбрать курс"
                      : "Выбрать класс"
                    : "Пока закрыто"}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassCard>
  );
}

function GradeProgram({
  gradeId,
  progress,
  paid,
  onBack,
  onOpenTopic,
  onExam,
}: {
  gradeId: GradeId;
  progress: SchoolProgress;
  paid: GradeId[];
  onBack: () => void;
  onOpenTopic: (topicId: string) => void;
  onExam: () => void;
}) {
  const grade = getGrade(gradeId);
  const open = canStudyGrade(progress, gradeId, paid);
  const prev = previousGradeId(gradeId);
  const topicIds = grade.topics.map((topic) => topic.id);
  const passedCount = topicsPassedCount(progress, gradeId, topicIds);
  const readyForExam = allTopicsPassed(progress, gradeId, topicIds);
  const examLock = examLockUntil(progress, gradeId);
  const best = progress.grades[gradeId].examBest;
  const percent = Math.round((passedCount / topicIds.length) * 100);

  if (!open) {
    const needsPay = !isGradePaid(gradeId, paid);
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
          <h2 className="mt-3 ty-title">
            {needsPay ? "Сначала оплата" : "Сначала предыдущий класс"}
          </h2>
          <p className="mt-2 ty-body">
            {needsPay
              ? "Этот курс откроется после оплаты. Доступ к оплаченным классам сохраняется."
              : `Чтобы учиться здесь, нужно окончить ${prev ? getGrade(prev).title : "предыдущий класс"} — пройти темы и сдать экзамен.`}
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
        subtitle={grade.subtitle}
        onBack={onBack}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <p className="ty-body">
          {grade.promise}
        </p>
        <div>
          <div className="mb-2 flex items-center justify-between ty-note">
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
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ty-label",
                      done
                        ? "bg-[#D3DA00] text-zinc-900"
                        : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block ty-heading">
                      {topic.title}
                    </span>
                    <span className="mt-0.5 block ty-note">
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
          <div className="flex items-center gap-2 ty-heading">
            <GraduationCap className="h-4 w-4" />
            Экзамен
          </div>
          <p className="mt-1 ty-note">
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
        <p className="mb-4 ty-body">
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
          <p className="ty-body text-zinc-700">{intro}</p>
          <p className="mt-3 ty-note">
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
