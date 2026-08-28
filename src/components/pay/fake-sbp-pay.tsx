"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { formatRub } from "@/lib/lead-services";
import { hapticImpact, hapticNotification } from "@/lib/haptics";

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

export function FakeSbpPayScreen({
  heading = "Оплата",
  serviceTitle,
  amountRub,
  note,
  successText,
  successAction = "Продолжить",
  onBack,
  onPaid,
}: {
  heading?: string;
  serviceTitle: string;
  amountRub: number;
  note: string;
  successText: string;
  successAction?: string;
  onBack: () => void;
  onPaid: () => void;
}) {
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
        <h1 className="ty-title">{heading}</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="mb-5 rounded-[20px] border border-black/8 bg-zinc-50 p-4 text-center">
          <p className="ty-note">{serviceTitle}</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums text-zinc-900">
            {formatRub(amountRub)}
          </p>
          <p className="mt-2 ty-note">{note}</p>
        </div>

        {done ? (
          <GlassCard className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h2 className="ty-title text-zinc-900">Оплата прошла</h2>
            <p className="mt-2 ty-body">
              {successText}
            </p>
            <Button className="mt-5 w-full" size="lg" onClick={onPaid}>
              {successAction}
            </Button>
          </GlassCard>
        ) : !method ? (
          <div className="space-y-2">
            <p className="mb-2 ty-subtitle text-zinc-600">
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
                <span className="block ty-heading">
                  СБП
                </span>
                <span className="mt-0.5 block ty-note">
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
                <span className="block ty-heading">
                  QR-код
                </span>
                <span className="mt-0.5 block ty-note">
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
            <p className="mt-1 ty-note">Ждём оплату…</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
