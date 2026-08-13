"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_ABOUT_LENGTH = 2000;

export function MasterAboutScreen({
  onBack,
  onConfirm,
  initialValue = "",
}: {
  onBack: () => void;
  onConfirm: (about: string) => void;
  initialValue?: string;
}) {
  const [about, setAbout] = useState(initialValue);
  const trimmed = about.trim();

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
        <h1 className="text-[20px] font-semibold text-zinc-900">
          Стать мастером
        </h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        Рассказать о себе
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-500">
        Коротко напишите об опыте, образовании и о том, с какими работами
        обычно берётесь. Это поможет быстрее понять, как мы можем
        сотрудничать.
      </p>

      <textarea
        value={about}
        onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT_LENGTH))}
        rows={8}
        placeholder="Например: электрик с опытом 8 лет, высшее профильное образование, работаю с квартирами и частными домами"
        className="mb-2 w-full resize-none rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[var(--accent)]/50"
      />
      <div className="mb-4 text-right text-[12px] text-zinc-400">
        {about.length}/{MAX_ABOUT_LENGTH}
      </div>

      <div className="mt-auto">
        <Button
          className="w-full"
          size="lg"
          disabled={!trimmed}
          onClick={() => onConfirm(trimmed)}
        >
          Продолжить
        </Button>
      </div>
    </motion.section>
  );
}
