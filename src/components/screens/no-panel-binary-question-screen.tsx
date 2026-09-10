"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export function NoPanelBinaryQuestionScreen({
  title,
  question,
  hint,
  yesLabel,
  noLabel,
  onBack,
  onYes,
  onNo,
}: {
  title: string;
  question: string;
  hint?: string;
  yesLabel: string;
  noLabel: string;
  onBack: () => void;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <header className="mb-4 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title truncate">{title}</h1>
      </header>

      <GlassCard className="mb-4 p-5">
        <p className="ty-heading text-zinc-900">{question}</p>
        {hint ? <p className="mt-2 ty-note text-zinc-600">{hint}</p> : null}
      </GlassCard>

      <div className="mt-auto flex shrink-0 flex-col gap-2">
        <Button className="w-full" onClick={onYes}>
          {yesLabel}
        </Button>
        <Button className="w-full" variant="secondary" onClick={onNo}>
          {noLabel}
        </Button>
      </div>
    </motion.section>
  );
}
