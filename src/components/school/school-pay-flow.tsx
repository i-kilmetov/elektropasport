"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import { canUseServerAuth } from "@/lib/client-auth";
import { beginTelegramLogin } from "@/lib/pd-consent-client";
import { formatRub } from "@/lib/lead-services";
import { hapticNotification } from "@/lib/haptics";
import { getGrade } from "@/lib/school";
import { SCHOOL_GRADE_PRICE_RUB } from "@/lib/school/access";
import type { GradeId } from "@/lib/school/types";
import {
  createSchoolPayment,
  fetchSbpPayment,
  openSbpPayload,
  type SbpPaymentClient,
} from "@/lib/user-data";
import { cn } from "@/lib/utils";

function classCaption(gradeId: GradeId): string {
  return getGrade(gradeId).title;
}

export function SchoolPaySheet({
  gradeId,
  onClose,
  onPay,
}: {
  gradeId: GradeId;
  onClose: () => void;
  onPay: () => void;
}) {
  const price = SCHOOL_GRADE_PRICE_RUB[gradeId];
  const termsId = useId();
  const [agreed, setAgreed] = useState(false);
  const [needAgree, setNeedAgree] = useState(false);
  const authed = canUseServerAuth();

  const tryPay = () => {
    if (!agreed) {
      setNeedAgree(true);
      return;
    }
    if (!authed) {
      void beginTelegramLogin("/school");
      return;
    }
    onPay();
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] bg-[var(--bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 lg:max-w-md lg:rounded-[28px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 lg:hidden" />
          <h2 className="ty-title">Оплата класса</h2>
          <p className="mt-2 ty-body">
            {classCaption(gradeId)} — {formatRub(price)}. После оплаты курс
            откроется, и доступ сохранится в вашем аккаунте.
          </p>
          {!authed ? (
            <p className="mt-3 ty-note">
              Чтобы оплатить, войдите через Telegram — так доступ не пропадёт
              при смене телефона.
            </p>
          ) : null}
          <Button className="mt-5 w-full" size="lg" onClick={tryPay}>
            {authed ? "Оплатить обучение" : "Войти через Telegram"}
          </Button>
          <div
            className={cn(
              "mt-3 flex items-start gap-3 rounded-[18px] border p-3",
              needAgree && !agreed
                ? "border-red-300 bg-red-50"
                : "border-black/10 bg-white/80",
            )}
          >
            <input
              id={termsId}
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked);
                if (event.target.checked) setNeedAgree(false);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 accent-zinc-800"
            />
            <div className="min-w-0 ty-note">
              <label htmlFor={termsId} className="cursor-pointer">
                Я принимаю{" "}
              </label>
              <a
                href="/legal/school"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-800 underline-offset-2 hover:underline"
              >
                условия обучающего курса
              </a>
              <label htmlFor={termsId} className="cursor-pointer">
                . Понимаю, что деньги не возвращаются, если я решу перестать
                учиться.
              </label>
            </div>
          </div>
          {needAgree && !agreed ? (
            <p className="mt-2 text-[12px] text-red-600">
              Чтобы оплатить, подтвердите согласие с условиями.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full py-2 text-center ty-subtitle"
          >
            Не сейчас
          </button>
        </motion.div>
      </motion.div>
    </Portal>
  );
}

export function SchoolPayScreen({
  gradeId,
  onBack,
  onPaid,
}: {
  gradeId: GradeId;
  onBack: () => void;
  onPaid: () => void;
}) {
  const price = SCHOOL_GRADE_PRICE_RUB[gradeId];
  const title = classCaption(gradeId);
  const [payment, setPayment] = useState<SbpPaymentClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const paidRef = useRef(false);

  const startPayment = () => {
    setLoading(true);
    setError(null);
    setPayment(null);
    paidRef.current = false;
    void createSchoolPayment(gradeId)
      .then((created) => {
        setPayment(created);
        if (created.status === "confirmed") {
          hapticNotification("success");
        }
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Не удалось создать платёж",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    startPayment();
    // One payment attempt per mount / grade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const timer = window.setInterval(() => {
      void fetchSbpPayment(payment.id)
        .then((next) => {
          setPayment(next);
          if (next.status === "confirmed" && !paidRef.current) {
            paidRef.current = true;
            hapticNotification("success");
          }
          if (next.status === "failed") {
            setError("Оплата не прошла. Попробуйте ещё раз.");
          }
        })
        .catch((err: unknown) => {
          console.error(err);
        });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment]);

  const done = payment?.status === "confirmed";

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <header className="mb-5 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title">Оплата обучения</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="mb-5 rounded-[20px] border border-black/8 bg-zinc-50 p-4 text-center">
          <p className="ty-note">{title}</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums text-zinc-900">
            {formatRub(price)}
          </p>
          <p className="mt-2 ty-note">
            Оплата через Robokassa: банковская карта, СБП и другие способы,
            доступные в платёжной форме. После подтверждения курс откроется.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-[14px]">Готовим счёт…</p>
          </div>
        ) : null}

        {error && !loading ? (
          <p className="mb-4 text-center ty-body text-rose-600">{error}</p>
        ) : null}

        {done ? (
          <GlassCard className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h2 className="ty-title text-zinc-900">Оплата прошла</h2>
            <p className="mt-2 ty-body">
              {title} — доступ открыт. Можно приступать к урокам.
            </p>
            <Button className="mt-5 w-full" size="lg" onClick={onPaid}>
              Перейти к обучению
            </Button>
          </GlassCard>
        ) : null}

        {payment?.qrPayload && payment.status === "pending" && !loading ? (
          <div className="space-y-3">
            <p className="text-center ty-body text-zinc-600">
              Нажмите кнопку — откроется страница Robokassa. Когда оплатите,
              вернитесь сюда: доступ откроется сам.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => openSbpPayload(payment.qrPayload!)}
            >
              Оплатить
            </Button>
          </div>
        ) : null}

        {error && !loading && !done ? (
          <Button
            className="mt-4 w-full"
            variant="secondary"
            onClick={startPayment}
          >
            Попробовать снова
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
