"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import { canUseServerAuth } from "@/lib/client-auth";
import { beginTelegramLogin } from "@/lib/pd-consent-client";
import { formatRub } from "@/lib/lead-services";
import { hapticNotification } from "@/lib/haptics";
import { getGrade } from "@/lib/school";
import { SCHOOL_GRADE_PRICE_RUB } from "@/lib/school/access";
import type { SchoolPromoPreview } from "@/lib/school/promo";
import type { GradeId } from "@/lib/school/types";
import {
  createSchoolPayment,
  fetchSbpPayment,
  openSbpPayload,
  validateSchoolPromo,
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
  const basePrice = SCHOOL_GRADE_PRICE_RUB[gradeId];
  const title = classCaption(gradeId);
  const [payment, setPayment] = useState<SbpPaymentClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<SchoolPromoPreview | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const paidRef = useRef(false);

  const payableAmount = appliedPromo?.finalAmountRub ?? basePrice;

  const applyPromo = () => {
    const code = promoInput.trim();
    if (!code) {
      setAppliedPromo(null);
      setPromoError(null);
      return;
    }
    setPromoLoading(true);
    setPromoError(null);
    void validateSchoolPromo(gradeId, code)
      .then((preview) => {
        setAppliedPromo(preview);
        setPromoInput(preview.code);
      })
      .catch((err: unknown) => {
        setAppliedPromo(null);
        setPromoError(
          err instanceof Error ? err.message : "Не удалось применить промокод",
        );
      })
      .finally(() => {
        setPromoLoading(false);
      });
  };

  const clearPromo = () => {
    setPromoInput("");
    setAppliedPromo(null);
    setPromoError(null);
  };

  const startPayment = () => {
    setLoading(true);
    setError(null);
    setPayment(null);
    paidRef.current = false;
    void createSchoolPayment(gradeId, appliedPromo?.code ?? promoInput.trim())
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
  const awaitingPay =
    payment?.status === "pending" &&
    payment.amountRub > 0 &&
    Boolean(payment.qrPayload);
  const canEditPromo = !loading && !done && !awaitingPay;

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
          {appliedPromo && appliedPromo.discountRub > 0 ? (
            <div className="mt-1">
              <p className="text-[18px] font-medium tabular-nums text-zinc-400 line-through">
                {formatRub(appliedPromo.originalAmountRub)}
              </p>
              <p className="text-[28px] font-bold tabular-nums text-zinc-900">
                {formatRub(appliedPromo.finalAmountRub)}
              </p>
              <p className="mt-1 ty-note text-emerald-700">
                Промокод {appliedPromo.code}: {appliedPromo.discountLabel}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-[28px] font-bold tabular-nums text-zinc-900">
              {formatRub(basePrice)}
            </p>
          )}
          <p className="mt-2 ty-note">
            {payableAmount <= 0
              ? "С промокодом курс откроется сразу после подтверждения."
              : "Оплата через Robokassa: банковская карта, СБП и другие способы, доступные в платёжной форме."}
          </p>
        </div>

        {canEditPromo ? (
          <GlassCard className="mb-5 space-y-3 p-4">
            <div className="flex items-center gap-2 ty-label text-zinc-600">
              <Tag className="h-4 w-4" />
              Промокод
            </div>
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  if (promoError) setPromoError(null);
                }}
                placeholder="Например, TOKOM2026"
                className="h-12 min-w-0 flex-1 rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[15px] uppercase outline-none placeholder:normal-case placeholder:text-zinc-400 focus:border-zinc-300"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-12 shrink-0 px-4"
                disabled={promoLoading || !promoInput.trim()}
                onClick={applyPromo}
              >
                {promoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Применить"
                )}
              </Button>
            </div>
            {promoError ? (
              <p className="ty-meta text-rose-600">{promoError}</p>
            ) : appliedPromo ? (
              <div className="flex items-center justify-between gap-3">
                <p className="ty-meta text-emerald-700">
                  Скидка применена: {appliedPromo.discountLabel}
                </p>
                <button
                  type="button"
                  onClick={clearPromo}
                  className="ty-meta text-zinc-500 underline-offset-2 hover:underline"
                >
                  Убрать
                </button>
              </div>
            ) : (
              <p className="ty-meta text-zinc-500">
                Если есть промокод, введите его до оплаты.
              </p>
            )}
          </GlassCard>
        ) : null}

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

        {!loading && !done && !payment ? (
          <Button className="w-full" size="lg" onClick={startPayment}>
            {payableAmount <= 0 ? "Получить бесплатно" : "Оплатить"}
          </Button>
        ) : null}

        {awaitingPay && !loading ? (
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
              Оплатить {formatRub(payment.amountRub)}
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
