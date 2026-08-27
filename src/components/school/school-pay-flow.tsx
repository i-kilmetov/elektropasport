"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Portal } from "@/components/ui/portal";
import { formatRub } from "@/lib/lead-services";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
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

function FakeQr() {
  const cells = [
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0],
  ];

  return (
    <div className="mx-auto w-[220px] rounded-[20px] bg-white p-3 shadow-[0_1px_8px_rgba(17,17,19,0.08)]">
      <div
        className="grid aspect-square w-full"
        style={{ gridTemplateColumns: `repeat(${cells[0].length}, 1fr)` }}
      >
        {cells.flatMap((row, y) =>
          row.map((on, x) => (
            <span
              key={`${y}-${x}`}
              className={on ? "bg-zinc-900" : "bg-white"}
            />
          )),
        )}
      </div>
    </div>
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
  const [method, setMethod] = useState<"sbp" | "qr" | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!method || done) return;
    const timer = window.setTimeout(() => {
      hapticNotification("success");
      setDone(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [method, done]);

  const pick = (next: "sbp" | "qr") => {
    hapticImpact("light");
    setMethod(next);
  };

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
        <h1 className="text-[20px] font-semibold text-zinc-900">Оплата обучения</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="mb-5 rounded-[20px] border border-black/8 bg-zinc-50 p-4 text-center">
          <p className="text-[13px] text-zinc-500">{classCaption(gradeId)}</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums text-zinc-900">
            {formatRub(price)}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Учебный платёж. После подтверждения курс откроется, доступ
            сохранится.
          </p>
        </div>

        {done ? (
          <GlassCard className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h2 className="text-[20px] font-bold text-zinc-900">Оплата прошла</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
              {classCaption(gradeId)} — доступ открыт. Можно приступать к урокам.
            </p>
            <Button className="mt-5 w-full" size="lg" onClick={onPaid}>
              Перейти к обучению
            </Button>
          </GlassCard>
        ) : !method ? (
          <div className="space-y-2">
            <p className="mb-2 text-[14px] font-medium text-zinc-600">
              Выберите способ
            </p>
            <button
              type="button"
              onClick={() => pick("sbp")}
              className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-4 text-left"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#1D1340] text-white">
                <Smartphone className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-zinc-900">
                  СБП
                </span>
                <span className="mt-0.5 block text-[13px] text-zinc-500">
                  Оплата через приложение банка
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => pick("qr")}
              className="flex w-full items-center gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-4 text-left"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-black/8 bg-white text-zinc-900">
                <QrCode className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-zinc-900">
                  QR-код
                </span>
                <span className="mt-0.5 block text-[13px] text-zinc-500">
                  Сканируйте камерой банка
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="text-center">
            {method === "qr" ? <FakeQr /> : null}
            {method === "sbp" ? (
              <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-[20px] bg-[#1D1340] text-white">
                <Smartphone className="h-16 w-16" />
              </div>
            ) : null}
            <p className="mt-4 text-[15px] font-medium text-zinc-700">
              {method === "qr"
                ? "Отсканируйте QR в приложении банка"
                : "Подтвердите платёж в приложении банка"}
            </p>
            <p className="mt-1 text-[13px] text-zinc-500">Ждём оплату…</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
