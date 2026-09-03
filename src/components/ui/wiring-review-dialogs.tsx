"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";

export function WiringReviewReadyDialog({
  onOpen,
  onLater,
}: {
  onOpen: () => void;
  onLater: () => void;
}) {
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <h3 className="mb-2 ty-title">Мастер проверил расключение</h3>
          <p className="mb-5 ty-body">
            Мастер проверил расключение щитка. Откройте схему, чтобы посмотреть
            расключение, а затем поставьте заключительную оценку.
          </p>
          <div className="flex gap-3">
            <Button className="flex-1" variant="secondary" onClick={onLater}>
              Позже
            </Button>
            <Button className="flex-1" onClick={onOpen}>
              Открыть
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}

export function MasterStarRatingDialog({
  onSubmit,
  onSkip,
}: {
  onSubmit: (score: number) => void | Promise<void>;
  onSkip: () => void;
}) {
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <h3 className="mb-2 ty-title">Оцените работу мастера</h3>
          <p className="mb-5 ty-body">
            Поставьте оценку от 1 до 5 — она войдёт в рейтинг мастера.
          </p>
          <div className="mb-5 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className="p-1"
                aria-label={`${n} из 5`}
              >
                <Star
                  className={cn(
                    "h-9 w-9 transition-colors",
                    n <= score
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-200",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" variant="secondary" onClick={onSkip}>
              Пропустить
            </Button>
            <Button
              className="flex-1"
              disabled={score === 0 || busy}
              onClick={() => {
                setBusy(true);
                void Promise.resolve(onSubmit(score)).finally(() =>
                  setBusy(false),
                );
              }}
            >
              Отправить
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
