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
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <header className="mb-3 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-[18px] font-semibold text-zinc-900 sm:text-[20px]">
          {setup.title}
        </h1>
      </header>

      <div
        className={`mb-3 flex shrink-0 items-start gap-2.5 rounded-[18px] border border-black/8 p-3 ${
          isOpportunity ? "bg-[#D3DA00]/30" : "bg-zinc-100"
        }`}
      >
        {isOpportunity ? (
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#111113]" />
        ) : (
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#111113]" />
        )}
        <p className="text-[13px] leading-snug text-zinc-800">{setup.banner}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {setup.risks.map((risk) => {
          const meta = riskCategoryMeta[risk.category];
          const Icon = meta.icon;
          return (
            <GlassCard
              key={risk.title}
              className="flex min-h-0 flex-1 flex-col overflow-hidden p-3"
            >
              <div className="mb-1 flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-[14px] font-semibold text-zinc-900">
                  {risk.title}
                </h3>
              </div>
              <p className="min-h-0 flex-1 overflow-hidden text-[12px] leading-snug text-zinc-500 sm:text-[13px]">
                {risk.text}
              </p>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-3 shrink-0">
        <Button className="w-full" onClick={onContinue}>
          Сделать правильно
        </Button>
      </div>
    </motion.section>
  );
}
