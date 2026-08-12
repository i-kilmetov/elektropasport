"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getNoPanelSetup,
  riskCategoryMeta,
  type NoPanelSetupId,
} from "@/lib/no-panel-setups";

export function NoPanelDetailScreen({
  setupId,
  onBack,
  onContinue,
}: {
  setupId: NoPanelSetupId;
  onBack: () => void;
  onContinue: () => void;
}) {
  const setup = getNoPanelSetup(setupId);
  const isOpportunity = setup.tone === "opportunity";

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
        <h1 className="truncate text-[20px] font-semibold text-zinc-900">
          {setup.title}
        </h1>
      </header>

      <div
        className={`mb-5 flex items-start gap-3 rounded-[20px] border p-4 ${
          isOpportunity
            ? "border-emerald-400/20 bg-emerald-500/10"
            : "border-amber-400/20 bg-amber-500/10"
        }`}
      >
        {isOpportunity ? (
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <p
          className={`text-[14px] leading-relaxed ${
            isOpportunity ? "text-emerald-900/80" : "text-amber-900/80"
          }`}
        >
          {setup.banner}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {setup.risks.map((risk) => {
          const meta = riskCategoryMeta[risk.category];
          const Icon = meta.icon;
          return (
            <GlassCard key={risk.title} className="p-4">
              <div className="mb-2 flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  {risk.title}
                </h3>
              </div>
              <p className="text-[14px] leading-relaxed text-zinc-500">
                {risk.text}
              </p>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-auto pt-2">
        <Button className="w-full" size="lg" onClick={onContinue}>
          Сделать правильно
        </Button>
      </div>
    </motion.section>
  );
}
