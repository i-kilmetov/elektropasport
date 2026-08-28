"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Phone, Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitMasterFeedback } from "@/lib/user-data";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 5 * 60 * 1000;

export function MasterSuccessScreen({
  requestId,
  master,
  onClose,
}: {
  requestId: string;
  master: { firstName: string; phone: string; username: string };
  onClose: () => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [reached, setReached] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setShowFeedback(true);
    }, FEEDBACK_DELAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleSubmitFeedback = async () => {
    setSubmitted(true);
    await submitMasterFeedback({
      requestId,
      userReached: reached ?? false,
      userScore: reached ? score : undefined,
    });
  };

  if (showFeedback && !submitted) {
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
              <Button
                className="flex-1"
                onClick={() => setReached(true)}
              >
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

  if (submitted && reached === false) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Phone className="h-7 w-7" />
          </div>
          <h2 className="ty-title text-zinc-900">
            Свяжемся с вами в течение дня
          </h2>
          <p className="max-w-[280px] ty-body">
            Не нашли свободных мастеров прямо сейчас, но обязательно перезвоним.
          </p>
          <Button onClick={onClose}>Понятно</Button>
        </div>
      </motion.section>
    );
  }

  if (submitted) {
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <Check className="h-10 w-10" strokeWidth={2.5} />
        </motion.div>

        <div>
          <h2 className="mb-1 ty-title">
            Мастер найден!
          </h2>
          <p className="ty-body">
            Свяжется с вами в течение 5 минут
          </p>
        </div>

        <div className="w-full max-w-xs rounded-[20px] border border-black/8 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left">
              <div className="ty-heading">
                {master.firstName || "Мастер"}
              </div>
              {master.phone && (
                <div className="ty-note">{master.phone}</div>
              )}
            </div>
          </div>
          {master.username && (
            <a
              href={`https://t.me/${master.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-[12px] bg-sky-50 px-3 py-2 text-center ty-subtitle text-sky-600"
            >
              Написать в Telegram
            </a>
          )}
        </div>

        <Button className="mt-2" variant="secondary" onClick={onClose}>
          На главную
        </Button>
      </div>
    </motion.section>
  );
}
