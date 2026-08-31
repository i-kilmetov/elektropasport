"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { PRODUCTION_APP_URL } from "@/lib/app-url";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  SURVEY_TOPIC_LABEL,
  getSurveyQuestion,
  nextSurveyStep,
  surveyPathLength,
  type SurveyAnswers,
} from "@/lib/research-survey";
import { persistResearchSurvey } from "@/lib/user-data";
import { cn } from "@/lib/utils";

const LAUNCH_REDIRECT_SECONDS = 10;
const LAUNCH_REDIRECT_URL = `${PRODUCTION_APP_URL}/?waitlist=1`;

function asStringArray(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function goToTokomLaunch() {
  window.location.assign(LAUNCH_REDIRECT_URL);
}

function SurveyThanksRedirect() {
  const [secondsLeft, setSecondsLeft] = useState(LAUNCH_REDIRECT_SECONDS);

  useEffect(() => {
    const started = Date.now();
    let redirected = false;
    const redirect = () => {
      if (redirected) return;
      redirected = true;
      goToTokomLaunch();
    };
    const tick = () => {
      const left = Math.max(
        0,
        LAUNCH_REDIRECT_SECONDS - Math.floor((Date.now() - started) / 1000),
      );
      setSecondsLeft(left);
      if (left <= 0) redirect();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, []);

  const secondsLabel =
    secondsLeft === 1
      ? "1 секунду"
      : secondsLeft >= 2 && secondsLeft <= 4
        ? `${secondsLeft} секунды`
        : `${secondsLeft} секунд`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-dvh flex-col px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="ty-display text-zinc-900">Спасибо за участие в опросе</h1>
        <p className="mt-3 max-w-sm ty-body">
          Через {secondsLabel} перенаправим вас на tokom.ru — там можно
          подписаться на новость о запуске сервиса.
        </p>
        <Button
          className="mt-8 w-full max-w-sm"
          size="lg"
          onClick={goToTokomLaunch}
        >
          Перейти на tokom.ru
        </Button>
      </div>
    </motion.section>
  );
}

export function ResearchSurveyScreen() {
  const [stepId, setStepId] = useState("q1");
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [multiDraft, setMultiDraft] = useState<string[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const question = useMemo(
    () => getSurveyQuestion(stepId, answers),
    [stepId, answers],
  );
  const pathAnswers = useMemo((): SurveyAnswers => {
    if (question.kind !== "multi") return answers;
    return { ...answers, [question.id]: multiDraft };
  }, [answers, multiDraft, question.id, question.kind]);
  const totalSteps = surveyPathLength(pathAnswers);
  const stepNumber = history.length + 1;
  const progress = Math.round((stepNumber / Math.max(totalSteps, 1)) * 100);

  const applyStep = (nextId: string, nextAnswers: SurveyAnswers) => {
    setHistory((prev) => [...prev, stepId]);
    setStepId(nextId);
    const nextQuestion = getSurveyQuestion(nextId, nextAnswers);
    setMultiDraft(
      nextQuestion.kind === "multi"
        ? asStringArray(nextAnswers[nextQuestion.id])
        : [],
    );
    setTextDraft(
      nextQuestion.kind === "text" ? asString(nextAnswers[nextQuestion.id]) : "",
    );
    setError(null);
  };

  const submitAnswers = async (finalAnswers: SurveyAnswers) => {
    setSubmitting(true);
    setError(null);
    try {
      await persistResearchSurvey(finalAnswers);
      hapticNotification("success");
      setDone(true);
    } catch (err) {
      hapticNotification("error");
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить ответы",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const completeStep = (nextAnswers: SurveyAnswers) => {
    const following = nextSurveyStep(stepId, nextAnswers);
    if (following === "done") {
      void submitAnswers(nextAnswers);
      return;
    }
    hapticImpact("light");
    applyStep(following, nextAnswers);
  };

  const chooseSingle = (optionId: string) => {
    if (submitting) return;
    const nextAnswers = { ...answers, [question.id]: optionId };
    setAnswers(nextAnswers);
    completeStep(nextAnswers);
  };

  const toggleMulti = (optionId: string) => {
    hapticImpact("light");
    setMultiDraft((prev) => {
      if (question.exclusiveOptionId && optionId === question.exclusiveOptionId) {
        return prev.includes(optionId) ? [] : [optionId];
      }
      const withoutExclusive = question.exclusiveOptionId
        ? prev.filter((id) => id !== question.exclusiveOptionId)
        : prev;
      return withoutExclusive.includes(optionId)
        ? withoutExclusive.filter((id) => id !== optionId)
        : [...withoutExclusive, optionId];
    });
  };

  const continueMulti = () => {
    if (multiDraft.length === 0) return;
    const nextAnswers = { ...answers, [question.id]: multiDraft };
    setAnswers(nextAnswers);
    completeStep(nextAnswers);
  };

  const continueText = (skip: boolean) => {
    const value = skip ? "" : textDraft.trim();
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    completeStep(nextAnswers);
  };

  const goBack = () => {
    const prevId = history.at(-1);
    if (!prevId || submitting) return;
    hapticImpact("light");
    setHistory((prev) => prev.slice(0, -1));
    setStepId(prevId);
    const prevQuestion = getSurveyQuestion(prevId, answers);
    setMultiDraft(
      prevQuestion.kind === "multi"
        ? asStringArray(answers[prevQuestion.id])
        : [],
    );
    setTextDraft(
      prevQuestion.kind === "text" ? asString(answers[prevQuestion.id]) : "",
    );
    setError(null);
  };

  if (done) {
    return <SurveyThanksRedirect />;
  }

  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-5">
        <div className="mb-3 flex items-center gap-3">
          {history.length > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-11 w-11" />
          )}
          <div className="min-w-0 flex-1">
            <div className="ty-label text-zinc-400">
              {question.topic
                ? SURVEY_TOPIC_LABEL[question.topic]
                : "Исследование"}{" "}
              · {stepNumber} из {totalSteps}
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepId}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.18 }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {question.concept && (
            <GlassCard className="mb-4 p-4 ty-body">
              {question.concept}
            </GlassCard>
          )}

          <h1 className="ty-display tracking-tight text-zinc-900">
            {question.title}
          </h1>
          {question.hint && (
            <p className="mt-2 ty-body">
              {question.hint}
            </p>
          )}

          <div className="mt-5 flex-1 space-y-2.5 overflow-y-auto pb-4">
            {question.kind !== "text" &&
              question.options?.map((option) => {
                const selected =
                  question.kind === "multi"
                    ? multiDraft.includes(option.id)
                    : asString(answers[question.id]) === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      question.kind === "multi"
                        ? toggleMulti(option.id)
                        : chooseSingle(option.id)
                    }
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[20px] border px-4 py-4 text-left transition-colors",
                      selected
                        ? "border-zinc-900 bg-zinc-900/[0.04] text-zinc-900"
                        : "border-black/8 bg-zinc-50 text-zinc-800",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white",
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="ty-subtitle leading-snug">
                      {option.label}
                    </span>
                  </button>
                );
              })}

            {question.kind === "text" && (
              <input
                value={textDraft}
                onChange={(event) => setTextDraft(event.target.value)}
                placeholder={question.placeholder}
                className="h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
              />
            )}
          </div>

          {error && (
            <p className="mb-3 text-[13px] leading-relaxed text-rose-600">
              {error}
            </p>
          )}

          {question.kind === "multi" && (
            <Button
              className="w-full"
              size="lg"
              disabled={multiDraft.length === 0 || submitting}
              onClick={continueMulti}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Сохраняем…
                </>
              ) : (
                "Далее"
              )}
            </Button>
          )}

          {question.kind === "text" && (
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                disabled={submitting}
                onClick={() => continueText(false)}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Сохраняем…
                  </>
                ) : (
                  "Отправить"
                )}
              </Button>
              <Button
                className="w-full"
                variant="ghost"
                disabled={submitting}
                onClick={() => continueText(true)}
              >
                Пропустить и отправить
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
