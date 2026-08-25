"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  CATALOG_KIND_OPTIONS,
  applianceKindIcon,
  catalogBrandsForKind,
  catalogModelsForBrand,
  createApplianceId,
  findCatalogModel,
  formatAppliancePower,
  type CatalogApplianceKind,
} from "@/lib/home-appliances";
import type { HomeAppliance, PanelObject } from "@/types";
import { cn } from "@/lib/utils";

type Step = "kind" | "brand" | "model";

export function AddApplianceSheet({
  panels,
  preferredPanelId,
  onClose,
  onSave,
}: {
  panels: PanelObject[];
  preferredPanelId?: string | null;
  onClose: () => void;
  onSave: (panelId: string, appliance: HomeAppliance) => void;
  onAddPanel?: () => void;
}) {
  const [step, setStep] = useState<Step>("kind");
  const [kind, setKind] = useState<CatalogApplianceKind | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState(
    preferredPanelId && panels.some((p) => p.id === preferredPanelId)
      ? preferredPanelId
      : (panels[0]?.id ?? ""),
  );
  const [error, setError] = useState<string | null>(null);

  const brands = useMemo(
    () => (kind ? catalogBrandsForKind(kind) : []),
    [kind],
  );
  const models = useMemo(
    () => (kind && brand ? catalogModelsForBrand(kind, brand) : []),
    [kind, brand],
  );
  const selectedModel = modelId ? findCatalogModel(modelId) : undefined;

  const headerTitle =
    step === "kind"
      ? "Вид техники"
      : step === "brand"
        ? "Производитель"
        : "Модель";

  const goBack = () => {
    setError(null);
    if (step === "model") {
      setModelId(null);
      setStep("brand");
      return;
    }
    if (step === "brand") {
      setBrand(null);
      setStep("kind");
      return;
    }
    onClose();
  };

  const save = () => {
    if (!panelId) {
      setError("Сначала добавьте щиток.");
      return;
    }
    const entry = modelId ? findCatalogModel(modelId) : undefined;
    if (!entry) {
      setError("Выберите модель из каталога.");
      return;
    }
    const appliance: HomeAppliance = {
      id: createApplianceId(),
      kind: entry.kind,
      title: entry.brand,
      brand: entry.brand,
      model: entry.model,
      powerW: entry.maxPowerW,
      catalogId: entry.id,
      createdAt: new Date().toISOString(),
    };
    onSave(panelId, appliance);
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] border border-black/8 bg-white shadow-2xl lg:max-w-md lg:rounded-[28px]"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5">
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Назад"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-[17px] font-semibold text-zinc-900">
              {headerTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {(kind || brand) && (
            <p className="shrink-0 px-5 pt-2 text-center text-[13px] text-zinc-500">
              {[
                kind
                  ? CATALOG_KIND_OPTIONS.find((k) => k.id === kind)?.title
                  : null,
                brand,
                selectedModel?.model,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {panels.length > 1 && step === "kind" && (
            <label className="mx-5 mt-4 block shrink-0">
              <span className="mb-1.5 block text-[13px] text-zinc-500">
                Щиток / объект
              </span>
              <select
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
                className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none"
              >
                {panels.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {step === "kind" && (
              <div className="space-y-2">
                {CATALOG_KIND_OPTIONS.map((item) => {
                  const Icon = applianceKindIcon(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setKind(item.id);
                        setBrand(null);
                        setModelId(null);
                        setStep("brand");
                      }}
                      className="flex w-full items-center gap-3 rounded-[18px] border border-black/8 bg-zinc-50 px-3 py-3 text-left transition-colors hover:bg-zinc-100"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-zinc-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-[15px] font-semibold text-zinc-900">
                        {item.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </button>
                  );
                })}
              </div>
            )}

            {step === "brand" && (
              <div className="space-y-2">
                {brands.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setBrand(name);
                      setModelId(null);
                      setStep("model");
                    }}
                    className="flex w-full items-center justify-between rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3.5 text-left transition-colors hover:bg-zinc-100"
                  >
                    <span className="text-[15px] font-semibold text-zinc-900">
                      {name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>
                ))}
              </div>
            )}

            {step === "model" && (
              <div className="space-y-2">
                {models.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModelId(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[18px] border px-4 py-3.5 text-left transition-colors",
                      modelId === item.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/8 bg-zinc-50 hover:bg-zinc-100",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        {item.model}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[12px]",
                          modelId === item.id
                            ? "text-white/70"
                            : "text-zinc-500",
                        )}
                      >
                        до {formatAppliancePower(item.maxPowerW)}
                      </span>
                    </span>
                    {modelId === item.id && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {step === "model" && (
            <div className="shrink-0 border-t border-black/[0.06] px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {selectedModel && (
                <p className="mb-3 text-center text-[13px] text-zinc-500">
                  Максимальная мощность:{" "}
                  <span className="font-semibold text-zinc-800">
                    {formatAppliancePower(selectedModel.maxPowerW)}
                  </span>
                </p>
              )}
              {error && (
                <p className="mb-2 text-center text-[13px] text-rose-600">
                  {error}
                </p>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedModel}
                onClick={save}
              >
                <Check className="h-5 w-5" />
                Добавить
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
