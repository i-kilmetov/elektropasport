"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  applianceKindIcon,
  applianceKindLabel,
  formatAppliancePower,
} from "@/lib/home-appliances";
import type { HomeAppliance } from "@/types";

export function ApplianceDetailScreen({
  appliance,
  homeTitle,
  onBack,
}: {
  appliance: HomeAppliance;
  homeTitle?: string;
  onBack: () => void;
}) {
  const [manualNotice, setManualNotice] = useState(false);
  const Icon = applianceKindIcon(appliance.kind);
  const brand = appliance.brand?.trim() || appliance.title;
  const model = appliance.model?.trim();

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative flex min-h-dvh min-w-0 flex-col overflow-x-hidden px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-semibold text-zinc-900">
            {brand}
          </h1>
          {homeTitle && (
            <p className="truncate text-[13px] text-zinc-500">{homeTitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setManualNotice(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
          aria-label="Руководство по эксплуатации"
        >
          <BookOpen className="h-5 w-5" />
        </button>
      </header>

      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <div className="flex h-36 items-center justify-center rounded-[24px] border border-black/8 bg-zinc-100 text-zinc-500">
          <Icon className="h-14 w-14" />
        </div>

        <GlassCard className="p-4">
          <p className="text-[13px] text-zinc-500">
            {applianceKindLabel(appliance.kind)}
          </p>
          <h2 className="mt-1 text-[22px] font-bold tracking-tight text-zinc-900">
            {brand}
          </h2>
          {model && (
            <p className="mt-1 text-[15px] text-zinc-500">{model}</p>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-500">
            <Zap className="h-4 w-4 text-amber-500" />
            Максимальная мощность
          </div>
          <div className="text-[28px] font-bold tracking-tight text-zinc-900">
            {formatAppliancePower(appliance.powerW)}
          </div>
        </GlassCard>

        {manualNotice && (
          <GlassCard className="border-sky-200 bg-sky-50 p-4">
            <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-sky-900">
              <BookOpen className="h-4 w-4" />
              Руководство по эксплуатации
            </div>
            <p className="text-[14px] leading-relaxed text-sky-900/80">
              В скором времени мы подгрузим эти данные. Сейчас инструкция для
              этой модели ещё готовится.
            </p>
          </GlassCard>
        )}
      </div>
    </motion.section>
  );
}
