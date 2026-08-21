"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Download, FileText, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  applianceCatalogItem,
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
  const catalog = applianceCatalogItem(appliance.kind);
  const manuals =
    appliance.manuals && appliance.manuals.length > 0
      ? appliance.manuals
      : catalog.manuals;

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
            {appliance.title}
          </h1>
          {homeTitle && (
            <p className="truncate text-[13px] text-zinc-500">{homeTitle}</p>
          )}
        </div>
      </header>

      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {appliance.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appliance.photoDataUrl}
            alt=""
            className="h-48 w-full rounded-[24px] object-cover"
          />
        ) : (
          <div className="flex h-36 items-center justify-center rounded-[24px] border border-black/8 bg-zinc-100 text-zinc-400">
            <Zap className="h-10 w-10" />
          </div>
        )}

        <GlassCard className="p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-500">
            <Zap className="h-4 w-4 text-amber-500" />
            Мощность прибора
          </div>
          <div className="text-[28px] font-bold tracking-tight text-zinc-900">
            {formatAppliancePower(appliance.powerW)}
          </div>
          {(appliance.brand || appliance.model) && (
            <p className="mt-2 text-[14px] text-zinc-500">
              {[appliance.brand, appliance.model].filter(Boolean).join(" · ")}
            </p>
          )}
        </GlassCard>

        <div>
          <h2 className="mb-2 text-[15px] font-semibold text-zinc-900">
            Инструкции по эксплуатации
          </h2>
          <div className="space-y-2">
            {manuals.map((manual) => (
              <a
                key={`${manual.title}-${manual.url}`}
                href={manual.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-3.5 transition-colors hover:bg-zinc-50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-rose-50 text-rose-600">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-zinc-900">
                    {manual.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-zinc-500">
                    PDF · скачать
                  </span>
                </span>
                <Download className="h-4 w-4 text-zinc-400" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
