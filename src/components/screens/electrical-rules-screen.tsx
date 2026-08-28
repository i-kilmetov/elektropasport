"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { electricalRules } from "@/lib/electrical-rules";

export function ElectricalRulesScreen({
  onBack,
  onOpenRule,
}: {
  onBack: () => void;
  onOpenRule: (id: string) => void;
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
        <h1 className="ty-title">
          Важное об электрике
        </h1>
      </header>

      <p className="mb-5 ty-body">
        Краткие правила по мотивам ПУЭ и практики безопасной эксплуатации.
        Это памятка, а не замена нормам и работе специалиста.
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {electricalRules.map((rule) => (
          <button
            key={rule.id}
            type="button"
            onClick={() => onOpenRule(rule.id)}
            className="w-full text-left"
          >
            <GlassCard className="flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-amber-500/15 text-amber-600">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block ty-heading">
                  {rule.title}
                </span>
                <span className="mt-0.5 block ty-note">
                  {rule.summary}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </GlassCard>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
