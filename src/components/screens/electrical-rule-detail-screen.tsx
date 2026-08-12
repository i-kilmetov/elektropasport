"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getElectricalRule } from "@/lib/electrical-rules";

export function ElectricalRuleDetailScreen({
  ruleId,
  onBack,
}: {
  ruleId: string;
  onBack: () => void;
}) {
  const rule = getElectricalRule(ruleId);

  if (!rule) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-dvh flex-col items-center justify-center px-5"
      >
        <p className="mb-4 text-zinc-500">Раздел не найден</p>
        <Button variant="secondary" onClick={onBack}>
          Назад
        </Button>
      </motion.section>
    );
  }

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
        <h1 className="line-clamp-2 text-[18px] font-semibold text-zinc-900">
          {rule.title}
        </h1>
      </header>

      <p className="mb-5 text-[15px] leading-relaxed text-zinc-500">
        {rule.summary}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {rule.points.map((point, index) => (
          <GlassCard key={point} className="flex gap-3 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[12px] font-semibold text-zinc-600">
              {index + 1}
            </span>
            <p className="text-[14px] leading-relaxed text-zinc-700">{point}</p>
          </GlassCard>
        ))}
      </div>

      <Button className="mt-auto w-full" variant="secondary" onClick={onBack}>
        К списку правил
      </Button>
    </motion.section>
  );
}
