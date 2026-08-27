"use client";

import { useMemo, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  examMark,
  isQuestionCorrect,
  miniQuizPassed,
  PLACEMENT_PASS_SCORE,
  scoreAnswers,
} from "@/lib/school/quiz";
import type { ExamGrade, SchoolQuestion } from "@/lib/school/types";
import { cn } from "@/lib/utils";

type QuizMode = "mini" | "exam" | "placement";

export type QuizFinish = {
  score: number;
  total: number;
  passed: boolean;
  grade?: ExamGrade;
};

export function QuizFlow({
  mode,
  title,
  questions,
  onExit,
  onFinish,
}: {
  mode: QuizMode;
  title: string;
  questions: SchoolQuestion[];
  onExit: () => void;
  onFinish: (result: QuizFinish) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [written, setWritten] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [review, setReview] = useState(false);

  const question = questions[index];
  const total = questions.length;
  const progress = Math.round(((index + (revealed ? 1 : 0)) / total) * 100);
  const immediate = mode === "mini";

  const result = useMemo(() => {
    if (!review && index < total - 1) return null;
    if (!review) return null;
    const scored = scoreAnswers(questions, answers);
    if (mode === "exam") {
      const grade = examMark(scored.score, scored.total);
      return { ...scored, passed: grade >= 3, grade };
    }
    if (mode === "placement") {
      return { ...scored, passed: scored.score >= PLACEMENT_PASS_SCORE };
    }
    return { ...scored, passed: miniQuizPassed(scored.score, scored.total) };
  }, [answers, index, mode, questions, review, total]);

  const commitCurrent = (): Record<string, string | string[]> => {
    const value =
      question.kind === "written" ? written : selected;
    return { ...answers, [question.id]: value };
  };

  const goNext = (nextAnswers: Record<string, string | string[]>) => {
    setAnswers(nextAnswers);
    setSelected([]);
    setWritten("");
    setRevealed(false);
    if (index + 1 >= total) {
      setReview(true);
      return;
    }
    setIndex(index + 1);
  };

  const confirmAnswer = () => {
    const empty =
      question.kind === "written" ? written.trim() === "" : selected.length === 0;
    if (empty) return;
    hapticImpact("light");
    const nextAnswers = commitCurrent();
    if (immediate) {
      setAnswers(nextAnswers);
      setRevealed(true);
      return;
    }
    goNext(nextAnswers);
  };

  if (review && result) {
    return (
      <QuizResult
        mode={mode}
        result={result}
        questions={questions}
        answers={answers}
        onFinish={() => onFinish(result)}
      />
    );
  }

  if (!question) return null;

  const currentCorrect = revealed
    ? isQuestionCorrect(question, answers[question.id] ?? "")
    : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[12px] text-zinc-500">
          <span>{title}</span>
          <span>
            {index + 1} / {total}
          </span>
        </div>
        <Progress value={Math.max(progress, ((index + 1) / total) * 100)} />
      </div>

      <GlassCard className="p-4">
        {question.kind === "multi" ? (
          <div className="mb-2 text-[12px] font-medium text-violet-600">
            Несколько правильных ответов
          </div>
        ) : null}
        <p className="text-[17px] font-semibold leading-snug text-zinc-900">
          {question.prompt}
        </p>
        {question.kind === "written" && question.hint ? (
          <p className="mt-2 text-[13px] text-zinc-500">{question.hint}</p>
        ) : null}
      </GlassCard>

      <div className="mt-3 flex-1 space-y-2">
        {question.kind === "written" ? (
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-zinc-500">
              Точный ответ{question.unit ? ` (${question.unit})` : ""}
            </span>
            <input
              value={written}
              onChange={(event) => setWritten(event.target.value)}
              disabled={revealed}
              inputMode={
                question.accepted.some((item) => /^\d/.test(item))
                  ? "decimal"
                  : "text"
              }
              className="h-12 w-full rounded-[16px] border border-black/8 bg-white px-3 text-[16px] text-zinc-900 outline-none focus:border-zinc-300"
              placeholder="Введите ответ"
            />
          </label>
        ) : (
          question.options.map((option) => {
            const on = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={revealed}
                onClick={() => {
                  hapticImpact("light");
                  if (question.kind === "single") {
                    setSelected([option.id]);
                    return;
                  }
                  setSelected((prev) =>
                    prev.includes(option.id)
                      ? prev.filter((id) => id !== option.id)
                      : [...prev, option.id],
                  );
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[18px] border px-4 py-3.5 text-left text-[15px] leading-snug transition-colors",
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-black/8 bg-white text-zinc-800",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    on
                      ? "border-white/40 bg-white text-zinc-900"
                      : "border-black/15 text-zinc-500",
                  )}
                >
                  {option.id.toUpperCase()}
                </span>
                {option.text}
              </button>
            );
          })
        )}
      </div>

      {revealed ? (
        <GlassCard
          className={cn(
            "mt-3 p-4",
            currentCorrect ? "bg-emerald-50" : "bg-rose-50",
          )}
        >
          <div className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900">
            {currentCorrect ? (
              <Check className="h-4 w-4 text-emerald-700" />
            ) : (
              <CircleAlert className="h-4 w-4 text-rose-700" />
            )}
            {currentCorrect ? "Верно" : "Пока нет"}
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">
            {question.explain}
          </p>
        </GlassCard>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onExit}>
          Выйти
        </Button>
        {revealed ? (
          <Button className="flex-1" onClick={() => goNext(answers)}>
            {index + 1 >= total ? "Результат" : "Дальше"}
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={
              question.kind === "written"
                ? written.trim() === ""
                : selected.length === 0
            }
            onClick={confirmAnswer}
          >
            {immediate ? "Ответить" : index + 1 >= total ? "Завершить" : "Дальше"}
          </Button>
        )}
      </div>
    </div>
  );
}

function QuizResult({
  mode,
  result,
  questions,
  answers,
  onFinish,
}: {
  mode: QuizMode;
  result: QuizFinish;
  questions: SchoolQuestion[];
  answers: Record<string, string | string[]>;
  onFinish: () => void;
}) {
  const headline =
    mode === "exam"
      ? result.grade === 5
        ? "Отлично"
        : result.grade === 4
          ? "Хорошо"
          : result.grade === 3
            ? "Удовлетворительно"
            : "Пока двойка"
      : result.passed
        ? "Зачёт"
        : "Пока не зачёт";

  const lead =
    mode === "exam"
      ? result.passed
        ? `Оценка ${result.grade}. Класс можно считать оконченным.`
        : "Нужно 10 верных из 20, чтобы закрыть класс. Пройдите темы ещё раз и попробуйте снова."
      : mode === "placement"
        ? result.passed
          ? "Входной тест сдан — добро пожаловать в класс."
          : "Нужно 7 верных из 10. Следующая попытка — не раньше чем через неделю: дайте себе время подготовиться."
        : result.passed
          ? "Тема закрыта. Можно идти дальше."
          : "Нужно 70% верных. Перечитайте урок и попробуйте ещё раз — сразу можно.";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GlassCard className="p-5 text-center">
        {result.grade ? (
          <div
            className={cn(
              "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] text-[28px] font-bold",
              result.grade >= 4
                ? "bg-[#D3DA00] text-zinc-900"
                : result.grade === 3
                  ? "bg-zinc-900 text-white"
                  : "bg-rose-100 text-rose-800",
            )}
          >
            {result.grade}
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
              result.passed ? "bg-[#D3DA00]" : "bg-rose-100",
            )}
          >
            {result.passed ? (
              <Check className="h-6 w-6 text-zinc-900" />
            ) : (
              <CircleAlert className="h-6 w-6 text-rose-700" />
            )}
          </div>
        )}
        <h2 className="text-[22px] font-bold text-zinc-900">{headline}</h2>
        <p className="mt-1 text-[15px] text-zinc-500">
          {result.score} из {result.total}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">{lead}</p>
      </GlassCard>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pb-3">
        {questions.map((question, index) => {
          const ok = isQuestionCorrect(question, answers[question.id] ?? "");
          return (
            <GlassCard key={question.id} className="p-3">
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug text-zinc-800">
                    {question.prompt}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-zinc-500">
                    {question.explain}
                  </p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <Button
        className="w-full"
        onClick={() => {
          hapticNotification(result.passed ? "success" : "warning");
          onFinish();
        }}
      >
        {mode === "placement" && !result.passed ? "Понятно" : "Дальше"}
      </Button>
    </div>
  );
}
