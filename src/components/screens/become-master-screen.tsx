"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export function BecomeMasterScreen({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">Стать мастером</h1>
      </header>

      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-zinc-100 text-zinc-600">
        <BadgeCheck className="h-8 w-8" />
      </div>

      <h2 className="mb-3 text-[26px] font-bold tracking-tight text-zinc-900">
        Ищем лучших специалистов
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-500">
        Мы всегда в поиске сильных кадров для сервиса Электропаспорт — людей,
        которые аккуратно работают с электрикой, уважают клиента и отвечают за
        результат.
      </p>

      <GlassCard className="mb-4 flex gap-3 p-4">
        <span className="mt-0.5 text-amber-600">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <div className="mb-1 text-[15px] font-semibold text-zinc-900">
            Обязательное условие
          </div>
          <p className="text-[14px] leading-relaxed text-zinc-500">
            Наличие профильного образования и подтверждённой квалификации.
            Без этого к работе с заявками сервиса мы не подключаем.
          </p>
        </div>
      </GlassCard>

      <GlassCard className="mb-6 space-y-2 p-4 text-[14px] leading-relaxed text-zinc-500">
        <p>Что будет дальше:</p>
        <p>1. Укажете город</p>
        <p>2. Расскажете о себе</p>
        <p>3. Оставите телефон или Telegram</p>
        <p>4. Мы свяжемся и расскажем о сотрудничестве</p>
      </GlassCard>

      <div className="mt-auto space-y-3">
        <Button className="w-full" size="lg" onClick={onConfirm}>
          Отправить заявку
        </Button>
        <Button className="w-full" variant="secondary" onClick={onBack}>
          Не сейчас
        </Button>
      </div>
    </motion.section>
  );
}
