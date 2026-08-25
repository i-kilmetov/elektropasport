"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  CATALOG_KIND_OPTIONS,
  applianceKindIcon,
  createApplianceId,
  formatAppliancePower,
  isCatalogApplianceKind,
  type CatalogApplianceKind,
} from "@/lib/home-appliances";
import type {
  ApplianceManual,
  ApplianceSpec,
  HomeAppliance,
  PanelObject,
} from "@/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none disabled:opacity-50";

type IcecatModelOption = {
  id: string;
  brand: string;
  productCode: string;
  modelName: string;
};

type ProductDetails = {
  powerW: number | null;
  specs: ApplianceSpec[];
  manuals: ApplianceManual[];
  title: string | null;
  matched: boolean;
};

export function AddApplianceSheet({
  panels,
  preferredPanelId,
  initialAppliance,
  onClose,
  onSave,
}: {
  panels: PanelObject[];
  preferredPanelId?: string | null;
  initialAppliance?: HomeAppliance | null;
  onClose: () => void;
  onSave: (panelId: string, appliance: HomeAppliance) => void;
  onAddPanel?: () => void;
}) {
  const editing = Boolean(initialAppliance);
  const [kind, setKind] = useState<CatalogApplianceKind | null>(
    initialAppliance && isCatalogApplianceKind(initialAppliance.kind)
      ? initialAppliance.kind
      : null,
  );
  const [brand, setBrand] = useState<string | null>(
    initialAppliance?.brand ?? null,
  );
  const [modelId, setModelId] = useState<string | null>(
    initialAppliance?.catalogId?.startsWith("icecat:")
      ? initialAppliance.catalogId.slice("icecat:".length)
      : null,
  );
  const [panelId, setPanelId] = useState(
    preferredPanelId && panels.some((p) => p.id === preferredPanelId)
      ? preferredPanelId
      : (panels[0]?.id ?? ""),
  );
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [catalogReady, setCatalogReady] = useState(true);
  const [models, setModels] = useState<IcecatModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const selectedModel = models.find((m) => m.id === modelId) ?? null;

  useEffect(() => {
    if (!kind) {
      setBrands([]);
      setCatalogReady(true);
      return;
    }
    let cancelled = false;
    setBrandsLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/appliances/icecat/brands?kind=${encodeURIComponent(kind)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          brands?: string[];
          catalogReady?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Не удалось загрузить бренды");
        setBrands(Array.isArray(data.brands) ? data.brands : []);
        setCatalogReady(data.catalogReady !== false);
      } catch (err) {
        if (cancelled) return;
        setBrands([]);
        setError(err instanceof Error ? err.message : "Ошибка загрузки брендов");
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  useEffect(() => {
    if (!kind || !brand) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams({ kind, brand });
        const res = await fetch(
          `/api/appliances/icecat/models?${params.toString()}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          models?: IcecatModelOption[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Не удалось загрузить модели");
        setModels(Array.isArray(data.models) ? data.models : []);
      } catch (err) {
        if (cancelled) return;
        setModels([]);
        setError(err instanceof Error ? err.message : "Ошибка загрузки моделей");
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, brand]);

  useEffect(() => {
    if (!modelId) {
      setDetails(null);
      setDetailsLoading(false);
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/appliances/icecat/product?id=${encodeURIComponent(modelId)}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as ProductDetails & { error?: string };
          if (cancelled) return;
          if (!res.ok) throw new Error(data.error || "Не удалось загрузить характеристики");
          setDetails({
            powerW: data.powerW ?? null,
            specs: Array.isArray(data.specs) ? data.specs : [],
            manuals: Array.isArray(data.manuals) ? data.manuals : [],
            title: data.title ?? null,
            matched: Boolean(data.matched),
          });
        } catch (err) {
          if (cancelled) return;
          setDetails(null);
          setError(
            err instanceof Error ? err.message : "Ошибка загрузки характеристик",
          );
        } finally {
          if (!cancelled) setDetailsLoading(false);
        }
      })();
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [modelId]);

  const save = () => {
    if (!panelId) {
      setError("Сначала добавьте щиток.");
      return;
    }
    if (!kind || !selectedModel) {
      setError("Выберите тип, производителя и модель.");
      return;
    }
    if (detailsLoading) {
      setError("Подождите, загружаются характеристики…");
      return;
    }

    const powerW = details?.powerW ?? undefined;
    const powerSpec: ApplianceSpec | null =
      powerW != null
        ? {
            label: "Максимальная мощность",
            value: `${Math.round(powerW)} Вт`,
          }
        : null;
    const specs: ApplianceSpec[] = [
      ...(powerSpec ? [powerSpec] : []),
      ...(details?.specs ?? []).filter(
        (spec) => !/мощност|power|watt/i.test(spec.label),
      ),
    ];

    const manuals: ApplianceManual[] = [...(details?.manuals ?? [])];
    if (manuals.length === 0) {
      manuals.push({
        title: "Карточка товара",
        url: `https://icecat.biz/search?query=${encodeURIComponent(`${selectedModel.brand} ${selectedModel.productCode}`)}`,
      });
    }

    const appliance: HomeAppliance = {
      id: initialAppliance?.id ?? createApplianceId(),
      kind,
      title: selectedModel.brand,
      brand: selectedModel.brand,
      model: selectedModel.modelName || selectedModel.productCode,
      powerW,
      catalogId: `icecat:${selectedModel.id}`,
      specs,
      manuals,
      createdAt: initialAppliance?.createdAt ?? new Date().toISOString(),
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
            <div className="w-10" />
            <h2 className="text-[17px] font-semibold text-zinc-900">
              {editing ? "Изменить технику" : "Добавить технику"}
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

          {panels.length > 1 && (
            <label className="mx-5 mt-4 block shrink-0">
              <span className="mb-1.5 block text-[13px] text-zinc-500">
                Щиток / объект
              </span>
              <select
                value={panelId}
                onChange={(e) => setPanelId(e.target.value)}
                className={selectClassName}
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
            <p className="mb-3 text-[13px] font-medium text-zinc-500">
              Тип техники
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {CATALOG_KIND_OPTIONS.map((item) => {
                const Icon = applianceKindIcon(item.id);
                const selected = kind === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (kind === item.id) return;
                      setKind(item.id);
                      setBrand(null);
                      setModelId(null);
                      setModels([]);
                      setDetails(null);
                      setError(null);
                    }}
                    className={cn(
                      "flex min-h-[104px] flex-col items-start gap-3 rounded-[20px] border p-3.5 text-left transition-colors",
                      selected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/8 bg-zinc-50 text-zinc-900 hover:bg-zinc-100",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-[12px]",
                        selected
                          ? "bg-white/15 text-white"
                          : "bg-white text-zinc-700 shadow-sm",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[13px] font-semibold leading-snug">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {kind && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4 overflow-hidden pt-5"
                >
                  {!catalogReady && (
                    <p className="rounded-[16px] bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                      Каталог производителей ещё не загружен. Попробуйте позже.
                    </p>
                  )}
                  {catalogReady && !brandsLoading && brands.length === 0 && (
                    <p className="rounded-[16px] bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600">
                      Для этого типа техники пока нет производителей в каталоге.
                    </p>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">
                      Производитель
                    </span>
                    <select
                      value={brand ?? ""}
                      disabled={brandsLoading || brands.length === 0}
                      onChange={(e) => {
                        setBrand(e.target.value || null);
                        setModelId(null);
                        setDetails(null);
                        setError(null);
                      }}
                      className={selectClassName}
                    >
                      <option value="">
                        {brandsLoading
                          ? "Загрузка…"
                          : "Выберите производителя"}
                      </option>
                      {brands.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <AnimatePresence initial={false}>
                    {brand && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-medium text-zinc-500">
                            Модель
                          </span>
                          <select
                            value={modelId ?? ""}
                            disabled={modelsLoading || models.length === 0}
                            onChange={(e) => {
                              setModelId(e.target.value || null);
                              setError(null);
                            }}
                            className={selectClassName}
                          >
                            <option value="">
                              {modelsLoading
                                ? "Загрузка…"
                                : "Выберите модель"}
                            </option>
                            {models.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.modelName || item.productCode}
                              </option>
                            ))}
                          </select>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-black/[0.06] px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {selectedModel && (
              <div className="mb-3 space-y-1 text-center text-[13px] text-zinc-500">
                <p>
                  {selectedModel.brand}{" "}
                  {selectedModel.modelName || selectedModel.productCode}
                </p>
                {detailsLoading && <p>Загружаем характеристики…</p>}
                {!detailsLoading && details?.powerW != null && (
                  <p>
                    Мощность:{" "}
                    <span className="font-semibold text-zinc-800">
                      {formatAppliancePower(details.powerW)}
                    </span>
                  </p>
                )}
                {!detailsLoading && details && details.powerW == null && (
                  <p>Мощность не указана</p>
                )}
              </div>
            )}
            {error && (
              <p className="mb-2 text-center text-[13px] text-rose-600">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedModel || detailsLoading}
              onClick={save}
            >
              <Check className="h-5 w-5" />
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
