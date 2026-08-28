"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableSection } from "@/components/ui/expandable-section";
import { GlassCard } from "@/components/ui/glass-card";
import { formatBuildingYear } from "@/lib/house-insight";
import {
  getNoPanelSetup,
  riskCategoryMeta,
  type NoPanelSetupId,
} from "@/lib/no-panel-setups";
import type { PanelHouseSnapshot } from "@/types";

export function NoPanelDetailScreen({
  setupId,
  saved = false,
  address,
  houseSnapshot,
  adding = false,
  onBack,
  onFix,
  onAdd,
  onEditAddress,
}: {
  setupId: NoPanelSetupId;
  saved?: boolean;
  address?: string;
  houseSnapshot?: PanelHouseSnapshot;
  adding?: boolean;
  onBack: () => void;
  onFix: () => void;
  onAdd?: () => void;
  onEditAddress?: () => void;
}) {
  const setup = getNoPanelSetup(setupId);
  const isOpportunity = setup.tone === "opportunity";
  const isInlet = setupId === "inlet_cable";
  const showAdd = Boolean(onAdd) && !saved && !isInlet;
  const addressLabel =
    houseSnapshot?.address?.trim() ||
    (address && address !== "Адрес не указан" ? address : "");

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
        <h1 className="ty-title truncate">{setup.title}</h1>
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
        <p className="ty-note text-zinc-800">{setup.banner}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-none">
        {setup.risks.map((risk, index) => {
          const meta = riskCategoryMeta[risk.category];
          const Icon = meta.icon;
          return (
            <ExpandableSection
              key={risk.title}
              title={risk.title}
              defaultOpen={index === 0}
              icon={<Icon className="h-4 w-4" />}
            >
              {risk.text}
            </ExpandableSection>
          );
        })}

        {saved && (
          <GlassCard
            className={`p-4 ${onEditAddress ? "cursor-pointer transition-colors active:bg-zinc-50" : ""}`}
            onClick={onEditAddress}
            role={onEditAddress ? "button" : undefined}
          >
            <div className="mb-2 flex items-center gap-1.5 ty-note">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              Адрес
            </div>
            {houseSnapshot || addressLabel ? (
              <div className="space-y-2">
                <p className="ty-heading leading-snug text-zinc-900">
                  {addressLabel || houseSnapshot?.address}
                </p>
                {houseSnapshot && houseSnapshot.buildingYear != null && (
                  <>
                    <p className="ty-note">
                      Год постройки:{" "}
                      <span className="font-medium text-zinc-800">
                        {formatBuildingYear(houseSnapshot.buildingYear)}
                      </span>
                    </p>
                    <p className="ty-note">
                      {houseSnapshot.groundingTitle}.{" "}
                      {houseSnapshot.groundingSummary}
                    </p>
                  </>
                )}
                {onEditAddress && (
                  <span className="ty-label block pt-1 text-zinc-700">
                    Изменить адрес
                  </span>
                )}
              </div>
            ) : (
              <div>
                <p className="ty-note text-zinc-400">
                  Укажем адрес автоматически по геопозиции.
                </p>
                {onEditAddress && (
                  <span className="ty-label mt-2 block text-zinc-700">
                    Определить адрес
                  </span>
                )}
              </div>
            )}
          </GlassCard>
        )}
      </div>

      <div className="mt-3 flex shrink-0 gap-2">
        {isInlet && !saved ? (
          <Button className="w-full" onClick={onFix}>
            Сделать правильно
          </Button>
        ) : showAdd ? (
          <>
            <Button className="min-w-0 flex-1" onClick={onFix}>
              Исправить
            </Button>
            <Button
              className="min-w-0 flex-1"
              variant="secondary"
              disabled={adding}
              onClick={onAdd}
            >
              {adding ? "Добавляем…" : "Добавить"}
            </Button>
          </>
        ) : (
          <Button className="w-full" onClick={onFix}>
            {isInlet ? "Сделать правильно" : "Исправить"}
          </Button>
        )}
      </div>
    </motion.section>
  );
}
