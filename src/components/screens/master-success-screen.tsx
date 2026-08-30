"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, User } from "lucide-react";
import { FakeSbpPayScreen } from "@/components/pay/fake-sbp-pay";
import { Button } from "@/components/ui/button";
import { OpenNearbyElectricalStoresButton } from "@/components/screens/open-nearby-electrical-stores-button";
import { submitMasterFeedback } from "@/lib/user-data";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 5 * 60 * 1000;

type MasterInfo = {
  firstName: string;
  phone: string;
  username: string;
  rating?: number;
};

export function MasterSuccessScreen({
  requestId,
  master,
  amountRub,
  city,
  address,
  lat,
  lon,
  onPaymentComplete,
  onOpenRequest,
  onClose,
}: {
  requestId: string;
  master: MasterInfo;
  amountRub: number;
  city?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  onPaymentComplete: () => void;
  onOpenRequest: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"awaiting_payment" | "paying" | "paid">(
    "awaiting_payment",
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [reached, setReached] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setShowFeedback(true);
    }, FEEDBACK_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmitFeedback = async () => {
    setSubmitted(true);
    await submitMasterFeedback({
      requestId,
      userReached: reached ?? false,
      userScore: reached ? score : undefined,
    });
  };

  if (phase === "paying") {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-0 flex-1 flex-col px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <FakeSbpPayScreen
          heading="Оплата вызова мастера"
          serviceTitle="Вызов мастера на дом"
          amountRub={amountRub}
          note="Оплата по СБП или QR. После подтверждения мастер перезвонит вам."
          successText="Оплата прошла. Мастер свяжется с вами в течение 5 минут."
          successAction="Готово"
          onBack={() => setPhase("awaiting_payment")}
          onPaid={() => {
            onPaymentComplete();
            setPhase("paid");
          }}
        />
      </motion.section>
    );
  }

  if (showFeedback && !submitted && phase === "paid") {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
      >
        <div className="w-full max-w-sm rounded-[24px] border border-black/8 bg-white p-6 shadow-xl">
          <h3 className="mb-4 text-center ty-title text-zinc-900">
            {reached === null
              ? "Мастер дозвонился до вас?"
              : reached
                ? "Как прошло общение?"
                : "Мы свяжемся с вами в течение дня"}
          </h3>

          {reached === null && (
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => setReached(true)}>
                Да, дозвонился
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => {
                  setReached(false);
                  void submitMasterFeedback({
                    requestId,
                    userReached: false,
                  });
                  setSubmitted(true);
                }}
              >
                Нет
              </Button>
            </div>
          )}

          {reached === true && (
            <>
              <div className="mb-5 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        n <= score
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-200",
                      )}
                    />
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={score === 0}
                onClick={handleSubmitFeedback}
              >
                Отправить оценку
              </Button>
            </>
          )}
        </div>
      </motion.section>
    );
  }

  if (submitted && phase === "paid") {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <h2 className="ty-title text-zinc-900">Спасибо за оценку!</h2>
          <Button onClick={onClose}>На главную</Button>
        </div>
      </motion.section>
    );
  }

  if (phase === "paid") {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
      >
        <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-10 w-10" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="mb-1 ty-title">Оплата прошла</h2>
            <p className="ty-body">
              Мастер перезвонит вам в течение 5 минут и договорится о времени
              приезда.
            </p>
          </div>
          <Button className="w-full" onClick={onOpenRequest}>
            Открыть страницу заявки
          </Button>
          <OpenNearbyElectricalStoresButton
            city={city}
            address={address}
            lat={lat}
            lon={lon}
            className="w-full"
            label="Показать магазины электротоваров"
          />
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.15,
          }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <Check className="h-10 w-10" strokeWidth={2.5} />
        </motion.div>

        <div>
          <h2 className="mb-1 ty-title">Мастер найден!</h2>
          <p className="ty-body">Осталось оплатить вызов</p>
        </div>

        <div className="w-full rounded-[20px] border border-black/8 bg-white p-4 shadow-sm text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="ty-heading">
                {master.firstName || "Мастер"}
              </div>
              {typeof master.rating === "number" && (
                <div className="mt-0.5 flex items-center gap-1.5 ty-note text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium tabular-nums">
                    {master.rating}%
                  </span>
                  <span className="text-zinc-500">рейтинг</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full">
          <Button className="w-full" size="lg" onClick={() => setPhase("paying")}>
            Оплатить вызов мастера
          </Button>
          <p className="mt-3 ty-note text-zinc-500">
            Мастер перезвонит вам в течение 5 минут и договорится с вами о
            времени приезда.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
