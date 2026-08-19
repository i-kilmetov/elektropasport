"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { submitMasterFeedback } from "@/lib/user-data";

export function MasterFeedbackDialog({
  requestId,
  role,
  onClose,
}: {
  requestId: string;
  role: "master";
  onClose: () => void;
}) {
  const [reached, setReached] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = async (didReach: boolean) => {
    setReached(didReach);
    setSubmitted(true);
    await submitMasterFeedback({
      requestId,
      masterReached: didReach,
    });
  };

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-[24px] border border-black/8 bg-white p-6 shadow-xl"
          >
            {submitted ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Phone className="h-6 w-6" />
                </div>
                <h3 className="text-[17px] font-bold text-zinc-900">
                  {reached ? "Отлично, спасибо!" : "Понятно, спасибо"}
                </h3>
                <Button className="mt-2" variant="secondary" onClick={onClose}>
                  Закрыть
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-zinc-900">
                    Удалось дозвониться до клиента?
                  </h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mb-5 text-[14px] text-zinc-500">
                  Это важно для рейтинга — учитывается подтверждение с обеих сторон.
                </p>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => handleAnswer(true)}>
                    Да, дозвонился
                  </Button>
                  <Button
                    className="flex-1"
                    variant="secondary"
                    onClick={() => handleAnswer(false)}
                  >
                    Нет
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
