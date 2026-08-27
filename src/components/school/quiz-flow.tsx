"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  CHOICE_SECONDS,
  examMark,
  isQuestionCorrect,
  miniQuizPassed,
  PLACEMENT_PASS_SCORE,
  scoreAnswers,
  WRITTEN_SECONDS,
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

function questionLimitSec(question: SchoolQuestion): number {
  return question.kind === "written" ? WRITTEN_SECONDS : CHOICE_SECONDS;
}

export function QuizFlow({
  mode,
  title,
  questions,
  onExit,
  onFinish,
  tone = "light",
}: {
  mode: QuizMode;
  title: string;
  questions: SchoolQuestion[];
  onExit: () => void;
  onFinish: (result: QuizFinish) => void;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const timed = mode === "exam" || mode === "placement";
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [written, setWritten] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [review, setReview] = useState(false);
  const [leftMs, setLeftMs] = useState(0);

  const question = questions[index];
  const total = questions.length;
  const progress = Math.round(((index + (revealed ? 1 : 0)) / total) * 100);
  const immediate = mode === "mini";
  const limitSec = question ? questionLimitSec(question) : CHOICE_SECONDS;

  const selectedRef = useRef(selected);
  const writtenRef = useRef(written);
  const answersRef = useRef(answers);
  selectedRef.current = selected;
  writtenRef.current = written;
  answersRef.current = answers;

  const result = useMemo(() => {
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
  }, [answers, mode, questions, review]);

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
    const value = question.kind === "written" ? written : selected;
    const nextAnswers = { ...answers, [question.id]: value };
    if (immediate) {
      setAnswers(nextAnswers);
      setRevealed(true);
      return;
    }
    goNext(nextAnswers);
  };

  useEffect(() => {
    if (!timed || revealed || review || !question) return;
    const budget = questionLimitSec(question) * 1000;
    setLeftMs(budget);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(0, budget - (Date.now() - started));
      setLeftMs(left);
      if (left > 0) return;
      window.clearInterval(tick);
      hapticNotification("warning");
      const nextAnswers = {
        ...answersRef.current,
        [question.id]:
          question.kind === "written"
            ? writtenRef.current
            : selectedRef.current,
      };
      setAnswers(nextAnswers);
      setSelected([]);
      setWritten("");
      setRevealed(false);
      if (index + 1 >= total) {
        setReview(true);
      } else {
        setIndex((prev) => prev + 1);
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [index, question, revealed, review, timed, total]);

  if (review && result) {
    return (
      <QuizResult
        mode={mode}
        result={result}
        questions={questions}
        answers={answers}
        onFinish={() => onFinish(result)}
        dark={dark}
      />
    );
  }

  if (!question) return null;

  const currentCorrect = revealed
    ? isQuestionCorrect(question, answers[question.id] ?? "")
    : false;
  const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
  const timerRatio = timed ? leftMs / (limitSec * 1000) : 1;
  const timerHot = timed && leftSec <= 8;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4">
        <div
          className={cn(
            "mb-2 flex items-center justify-between text-[12px]",
            dark ? "text-white/45" : "text-zinc-500",
          )}
        >
          <span>{title}</span>
          <span className="tabular-nums">
            {timed ? (
              <span className={cn(timerHot && "font-semibold text-rose-400")}>
                {leftSec} с · {index + 1} / {total}
              </span>
            ) : (
              `${index + 1} / ${total}`
            )}
          </span>
        </div>
        {timed ? (
          <div
            className={cn(
              "mb-2 h-1.5 overflow-hidden rounded-full",
              dark ? "bg-white/10" : "bg-zinc-200",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-100",
                timerHot ? "bg-rose-500" : "bg-[#D3DA00]",
              )}
              style={{ width: `${Math.max(0, timerRatio * 100)}%` }}
            />
          </div>
        ) : null}
        <Progress value={Math.max(progress, ((index + 1) / total) * 100)} />
      </div>

      <GlassCard
        className={cn("p-4", dark && "border-white/10 bg-white/[0.06] shadow-none")}
      >
        {question.kind === "multi" ? (
          <div
            className={cn(
              "mb-2 text-[12px] font-medium",
              dark ? "text-[#D3DA00]" : "text-violet-600",
            )}
          >
            Несколько правильных ответов
          </div>
        ) : null}
        <p
          className={cn(
            "text-[17px] font-semibold leading-snug",
            dark ? "text-white" : "text-zinc-900",
          )}
        >
          {question.prompt}
        </p>
        {question.kind === "written" && question.hint ? (
          <p
            className={cn(
              "mt-2 text-[13px]",
              dark ? "text-white/45" : "text-zinc-500",
            )}
          >
            {question.hint}
          </p>
        ) : null}
      </GlassCard>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {question.kind === "written" ? (
          <label className="block">
            <span
              className={cn(
                "mb-1.5 block text-[13px]",
                dark ? "text-white/45" : "text-zinc-500",
              )}
            >
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
              className={cn(
                "h-12 w-full rounded-[16px] border px-3 text-[16px] outline-none",
                dark
                  ? "border-white/12 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30"
                  : "border-black/8 bg-white text-zinc-900 focus:border-zinc-300",
              )}
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
                    ? dark
                      ? "border-[#D3DA00] bg-[#D3DA00] text-[#111113]"
                      : "border-zinc-900 bg-zinc-900 text-white"
                    : dark
                      ? "border-white/10 bg-white/[0.04] text-white/85"
                      : "border-black/8 bg-white text-zinc-800",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    on
                      ? dark
                        ? "border-[#111113]/30 bg-[#111113] text-[#D3DA00]"
                        : "border-white/40 bg-white text-zinc-900"
                      : dark
                        ? "border-white/25 text-white/50"
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
            dark && (currentCorrect ? "bg-emerald-500/15" : "bg-rose-500/15"),
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-[14px] font-semibold",
              dark ? "text-white" : "text-zinc-900",
            )}
          >
            {currentCorrect ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <CircleAlert className="h-4 w-4 text-rose-400" />
            )}
            {currentCorrect ? "Верно" : "Пока нет"}
          </div>
          <p
            className={cn(
              "mt-1.5 text-[14px] leading-relaxed",
              dark ? "text-white/60" : "text-zinc-600",
            )}
          >
            {question.explain}
          </p>
        </GlassCard>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          className={cn(
            "flex-1",
            dark && "border-white/10 bg-white/8 text-white hover:bg-white/12",
          )}
          onClick={onExit}
        >
          Выйти
        </Button>
        {revealed ? (
          <Button
            className={cn(
              "flex-1",
              dark &&
                "border-0 !bg-[#D3DA00] text-[#111113] shadow-none hover:!bg-[#c8cf00]",
            )}
            onClick={() => goNext(answers)}
          >
            {index + 1 >= total ? "Результат" : "Дальше"}
          </Button>
        ) : (
          <Button
            className={cn(
              "flex-1",
              dark &&
                "border-0 !bg-[#D3DA00] text-[#111113] shadow-none hover:!bg-[#c8cf00]",
            )}
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
  dark = false,
}: {
  mode: QuizMode;
  result: QuizFinish;
  questions: SchoolQuestion[];
  answers: Record<string, string | string[]>;
  onFinish: () => void;
  dark?: boolean;
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
        : "Нужно 10 верных из 20. Следующая попытка — не раньше чем через неделю."
      : mode === "placement"
        ? result.passed
          ? "Входной тест сдан — добро пожаловать в класс."
          : "Нужно 7 верных из 10. Следующая попытка — не раньше чем через неделю: дайте себе время подготовиться."
        : result.passed
          ? "Тема закрыта. Можно идти дальше."
          : "Нужно 70% верных. Перечитайте урок и попробуйте ещё раз — сразу можно.";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GlassCard
        className={cn(
          "p-5 text-center",
          dark && "border-white/10 bg-white/[0.06] shadow-none",
        )}
      >
        {result.grade ? (
          <div
            className={cn(
              "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[20px] text-[28px] font-bold",
              result.grade >= 4
                ? "bg-[#D3DA00] text-zinc-900"
                : result.grade === 3
                  ? dark
                    ? "bg-white text-[#111113]"
                    : "bg-zinc-900 text-white"
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
        <h2
          className={cn(
            "text-[22px] font-bold",
            dark ? "text-white" : "text-zinc-900",
          )}
        >
          {headline}
        </h2>
        <p
          className={cn(
            "mt-1 text-[15px]",
            dark ? "text-white/50" : "text-zinc-500",
          )}
        >
          {result.score} из {result.total}
        </p>
        <p
          className={cn(
            "mt-3 text-[14px] leading-relaxed",
            dark ? "text-white/60" : "text-zinc-600",
          )}
        >
          {lead}
        </p>
      </GlassCard>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pb-3">
        {questions.map((item, index) => {
          const ok = isQuestionCorrect(item, answers[item.id] ?? "");
          return (
            <GlassCard
              key={item.id}
              className={cn(
                "p-3",
                dark && "border-white/10 bg-white/[0.05] shadow-none",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    ok
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[13px] font-medium leading-snug",
                      dark ? "text-white/90" : "text-zinc-800",
                    )}
                  >
                    {item.prompt}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[12px] leading-snug",
                      dark ? "text-white/45" : "text-zinc-500",
                    )}
                  >
                    {item.explain}
                  </p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <Button
        className={cn(
          "w-full",
          dark &&
            "border-0 !bg-[#D3DA00] text-[#111113] shadow-none hover:!bg-[#c8cf00]",
        )}
        onClick={onFinish}
      >
        Готово
      </Button>
    </div>
  );
}
