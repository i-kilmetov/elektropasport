"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";

const STEPS = [
  "Подтвердите вводной автомат на схеме — через «Запустить диагностику» или нажатием на прибор.",
  "Нажмите на автомат или дифавтомат на схеме, который нужно подписать.",
  "Выберите «Определить линию прибора».",
  "Укажите тип жилья, отметьте помещения и технику, которая есть дома.",
  "Подтвердите, что можно кратко обесточить объект, включите свет и нагрузки в розетках.",
  "Опустите рычаг только этого прибора и обойдите помещения: отметьте, где пропал свет или перестала работать техника.",
  "Сохраните подпись линии. Повторите для остальных автоматов.",
] as const;

export function IdentifyLinesGuideSheet({ onClose }: { onClose: () => void }) {
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
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto max-h-[min(88vh,720px)] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="ty-heading">Как определить линии</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="ty-note text-zinc-600">
            Подпись линии показывает, какие комнаты и нагрузки питаются от
            каждого автомата. Это нужно для стикеров, безопасности и заявок
            мастеру.
          </p>

          <ol className="mt-4 list-decimal space-y-3 pl-5 ty-note text-zinc-700">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <Button className="mt-5 w-full" onClick={onClose}>
            Понятно
          </Button>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
