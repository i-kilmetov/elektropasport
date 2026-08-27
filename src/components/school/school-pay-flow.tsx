"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { FakeSbpPayScreen } from "@/components/pay/fake-sbp-pay";
import { formatRub } from "@/lib/lead-services";
import { getGrade } from "@/lib/school";
import { SCHOOL_GRADE_PRICE_RUB } from "@/lib/school/access";
import type { GradeId } from "@/lib/school/types";
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

  const tryPay = () => {
    if (!agreed) {
      setNeedAgree(true);
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
          <h2 className="text-[22px] font-bold text-zinc-900">Дальше будет оплата</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">
            {classCaption(gradeId)} — {formatRub(price)}. После оплаты курс
            откроется, и доступ к нему останется.
          </p>
          <Button className="mt-5 w-full" size="lg" onClick={tryPay}>
            Оплатить обучение
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
            <div className="min-w-0 text-[13px] leading-relaxed text-zinc-600">
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
            className="mt-3 w-full py-2 text-center text-[15px] font-medium text-zinc-500"
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

  return (
    <FakeSbpPayScreen
      heading="Оплата обучения"
      serviceTitle={title}
      amountRub={price}
      note="Учебный платёж. После подтверждения курс откроется, доступ сохранится."
      successText={`${title} — доступ открыт. Можно приступать к урокам.`}
      successAction="Перейти к обучению"
      onBack={onBack}
      onPaid={onPaid}
    />
  );
}
