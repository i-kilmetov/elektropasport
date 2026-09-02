"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplianceBarcodeScanner } from "@/components/ui/appliance-barcode-scanner";
import { Portal } from "@/components/ui/portal";
import type { BarcodeLookupResponse } from "@/lib/appliance-barcode";
import {
  FULL_CATALOG_KIND_OPTIONS,
  OTHER_CATALOG_KIND_OPTIONS,
  PRIMARY_CATALOG_KIND_OPTIONS,
  applianceKindIcon,
  createApplianceId,
  formatAppliancePower,
  isCatalogApplianceKind,
  isPrimaryCatalogApplianceKind,
  isQuickPickCatalogApplianceKind,
  catalogKindTitle,
  type CatalogApplianceKind,
} from "@/lib/home-appliances";
import {
  buildApplianceManualsSnapshot,
  buildApplianceSpecsSnapshot,
  extractPowerWattsFromSpecs,
  icecatStatusMessage,
  type LoadedProductDetails,
} from "@/lib/appliance-specs";
import type { HomeAppliance, PanelObject } from "@/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none disabled:opacity-50";

const CUSTOM_BRAND = "__custom_brand__";
const CUSTOM_MODEL = "__custom_model__";

function kindCardClass(selected: boolean) {
  return cn(
    "flex min-h-[104px] flex-col items-start gap-3 rounded-[20px] border p-3.5 text-left transition-colors",
    selected
      ? "border-zinc-900 bg-white text-zinc-900 shadow-[0_0_0_2px_#18181b]"
      : "border-black/8 bg-zinc-50 text-zinc-900 hover:bg-zinc-100",
  );
}

function kindIconWrapClass(selected: boolean) {
  return cn(
    "flex h-10 w-10 items-center justify-center rounded-[12px]",
    selected ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 shadow-sm",
  );
}

type IcecatModelOption = {
  id: string;
  brand: string;
  productCode: string;
  modelName: string;
};

type ProductDetails = LoadedProductDetails;

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
  const initialIsCustom =
    initialAppliance != null &&
    !initialAppliance.catalogId &&
    initialAppliance.kind === "other" &&
    Boolean(initialAppliance.title?.trim()) &&
    Boolean(initialAppliance.brand?.trim());
  const initialKind =
    initialAppliance && isCatalogApplianceKind(initialAppliance.kind)
      ? initialAppliance.kind
      : null;
  const [kind, setKind] = useState<CatalogApplianceKind | null>(initialKind);
  const [customKindMode, setCustomKindMode] = useState(initialIsCustom);
  const [customKindName, setCustomKindName] = useState(
    initialIsCustom ? (initialAppliance?.title ?? "") : "",
  );
  const [customBrandName, setCustomBrandName] = useState(
    initialIsCustom ? (initialAppliance?.brand ?? "") : "",
  );
  const [customModelName, setCustomModelName] = useState(
    initialIsCustom ? (initialAppliance?.model ?? "") : "",
  );
  const [otherKindsOpen, setOtherKindsOpen] = useState(
    initialIsCustom
      ? false
      : initialKind != null && !isPrimaryCatalogApplianceKind(initialKind),
  );
  const [allProductsOpen, setAllProductsOpen] = useState(
    initialKind != null && !isQuickPickCatalogApplianceKind(initialKind),
  );
  const [brand, setBrand] = useState<string | null>(
    initialIsCustom
      ? CUSTOM_BRAND
      : (initialAppliance?.brand ?? null),
  );
  const [modelId, setModelId] = useState<string | null>(
    initialIsCustom
      ? CUSTOM_MODEL
      : initialAppliance?.catalogId?.startsWith("icecat:")
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeBanner, setBarcodeBanner] = useState<string | null>(null);
  const [barcodeCatalogPick, setBarcodeCatalogPick] = useState(false);
  const skipModelsReloadRef = useRef(false);
  const skipDetailsReloadRef = useRef(false);

  const selectedModel = models.find((m) => m.id === modelId) ?? null;
  const otherKindSelected =
    kind != null && !isPrimaryCatalogApplianceKind(kind);
  const typeSelected = customKindMode || kind != null;
  const resolvedBrand = customKindMode
    ? customBrandName.trim()
    : brand === CUSTOM_BRAND
      ? customBrandName.trim()
      : (brand?.trim() ?? "");
  const resolvedModel = customKindMode
    ? customModelName.trim()
    : modelId === CUSTOM_MODEL
      ? customModelName.trim()
      : (selectedModel?.modelName || selectedModel?.productCode || "").trim();
  const usingCatalogModel =
    Boolean(modelId) && modelId !== CUSTOM_MODEL && Boolean(selectedModel);

  const selectKind = (
    nextKind: CatalogApplianceKind,
    options?: { fromAllProducts?: boolean },
  ) => {
    if (kind === nextKind && !customKindMode) return;
    setCustomKindMode(false);
    setCustomKindName("");
    setKind(nextKind);
    setBrand(null);
    setModelId(null);
    setModels([]);
    setDetails(null);
    if (!barcodeCatalogPick) setBarcodeBanner(null);
    setError(null);
    const fromAllProducts = options?.fromAllProducts === true;
    if (fromAllProducts) {
      setAllProductsOpen(true);
      setOtherKindsOpen(true);
    } else if (!barcodeCatalogPick) {
      setAllProductsOpen(false);
      if (isPrimaryCatalogApplianceKind(nextKind)) {
        setOtherKindsOpen(false);
      } else {
        setOtherKindsOpen(true);
      }
    }
  };

  const exitCustomKindMode = () => {
    setCustomKindMode(false);
    setCustomKindName("");
    setCustomBrandName("");
    setCustomModelName("");
    setBrand(null);
    setModelId(null);
    setOtherKindsOpen(true);
    setError(null);
  };

  const selectCustomKind = () => {
    setBarcodeCatalogPick(false);
    setCustomKindMode(true);
    setKind(null);
    setBrand(null);
    setModelId(null);
    setModels([]);
    setDetails(null);
    setCustomKindName("");
    setCustomBrandName("");
    setCustomModelName("");
    setAllProductsOpen(false);
    setBarcodeBanner(null);
    setError(null);
    setOtherKindsOpen(false);
  };

  const applyBarcodeNotFound = (gtin: string) => {
    setScannerOpen(false);
    setCustomKindMode(false);
    setCustomKindName("");
    setCustomBrandName("");
    setCustomModelName("");
    setKind(null);
    setBrand(null);
    setModelId(null);
    setModels([]);
    setDetails(null);
    setOtherKindsOpen(false);
    setAllProductsOpen(false);
    setBarcodeCatalogPick(true);
    setError(null);
    setBarcodeBanner(
      `Штрихкод ${gtin}: товар не найден. Выберите тип, производителя и модель.`,
    );
  };

  const applyBarcodeResult = (result: BarcodeLookupResponse) => {
    setBarcodeCatalogPick(false);
    skipModelsReloadRef.current = true;
    skipDetailsReloadRef.current = true;
    const nextKind =
      result.kind && isCatalogApplianceKind(result.kind) ? result.kind : null;
    const modelOption: IcecatModelOption = {
      id: result.product.id,
      brand: result.product.brand,
      productCode: result.product.productCode,
      modelName: result.product.modelName,
    };

    const detailsPayload: ProductDetails = {
      powerW: result.powerW,
      specs: result.specs,
      manuals: result.manuals,
      title: result.title,
      brandLogoUrl: result.brandLogoUrl,
      productImageUrl: result.productImageUrl,
      matched: true,
      status: result.status,
      statusDetail: result.statusDetail,
    };

    if (!nextKind) {
      setCustomKindMode(true);
      setKind(null);
      setCustomKindName(result.categoryName?.trim() || "Техника");
      setCustomBrandName(result.product.brand);
      setCustomModelName(result.product.modelName || result.product.productCode);
      setBrand(CUSTOM_BRAND);
      setModelId(CUSTOM_MODEL);
      setModels([]);
      setDetails(detailsPayload);
      setDetailsLoading(false);
      setOtherKindsOpen(false);
      setAllProductsOpen(false);
      setError(null);
      setBarcodeBanner(
        `Найдено: ${result.product.brand} ${result.product.modelName}. Уточните тип техники.`,
      );
      setScannerOpen(false);
      return;
    }

    setCustomKindMode(false);
    setCustomKindName("");
    setCustomBrandName("");
    setCustomModelName("");
    setKind(nextKind);
    setBrand(result.product.brand);
    setModelId(result.product.id);
    setModels([modelOption]);
    setDetails(detailsPayload);
    setDetailsLoading(false);
    setError(null);
    setBarcodeBanner(
      `Найдено: ${result.product.brand} ${result.product.modelName}`,
    );
    if (isPrimaryCatalogApplianceKind(nextKind)) {
      setOtherKindsOpen(false);
      setAllProductsOpen(false);
    } else if (isQuickPickCatalogApplianceKind(nextKind)) {
      setOtherKindsOpen(true);
      setAllProductsOpen(false);
    } else {
      setOtherKindsOpen(true);
      setAllProductsOpen(true);
    }
    setScannerOpen(false);
  };

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
    if (!kind || !brand || brand === CUSTOM_BRAND) {
      setModels([]);
      return;
    }
    if (skipModelsReloadRef.current) {
      skipModelsReloadRef.current = false;
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
    if (!modelId || modelId === CUSTOM_MODEL) {
      setDetails(null);
      setDetailsLoading(false);
      return;
    }
    if (skipDetailsReloadRef.current) {
      skipDetailsReloadRef.current = false;
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
            brandLogoUrl: data.brandLogoUrl ?? null,
            productImageUrl: data.productImageUrl ?? null,
            matched: Boolean(data.matched),
            status: data.status,
            statusDetail: data.statusDetail ?? null,
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

  useEffect(() => {
    const enrichKind = customKindMode ? ("other" as const) : kind;
    if (usingCatalogModel || !enrichKind || !resolvedBrand || !resolvedModel) {
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            kind: enrichKind,
            brand: resolvedBrand,
            model: resolvedModel,
          });
          const res = await fetch(`/api/appliances/enrich?${params.toString()}`, {
            cache: "no-store",
          });
          const data = (await res.json()) as {
            hit?: {
              powerW?: number | null;
              specs?: ProductDetails["specs"];
              manuals?: ProductDetails["manuals"];
              brandLogoUrl?: string | null;
              productImageUrl?: string | null;
            } | null;
            icecatStatus?: string;
            icecatDetail?: string;
            error?: string;
          };
          if (cancelled) return;
          if (!res.ok) throw new Error(data.error || "Не удалось найти характеристики");
          const hit = data.hit;
          if (cancelled) return;
          if (!hit) {
            setDetails({
              powerW: null,
              specs: [],
              manuals: [],
              title: null,
              brandLogoUrl: null,
              productImageUrl: null,
              matched: false,
              status: data.icecatStatus,
              statusDetail: data.icecatDetail ?? null,
            });
            return;
          }
          setDetails({
            powerW: hit.powerW ?? extractPowerWattsFromSpecs(hit.specs ?? []) ?? null,
            specs: Array.isArray(hit.specs) ? hit.specs : [],
            manuals: Array.isArray(hit.manuals) ? hit.manuals : [],
            title: null,
            brandLogoUrl: hit.brandLogoUrl ?? null,
            productImageUrl: hit.productImageUrl ?? null,
            matched: true,
            status: data.icecatStatus,
            statusDetail: data.icecatDetail ?? null,
          });
        } catch (err) {
          if (cancelled) return;
          setDetails(null);
        } finally {
          if (!cancelled) setDetailsLoading(false);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [usingCatalogModel, customKindMode, kind, resolvedBrand, resolvedModel]);

  const save = () => {
    if (!panelId) {
      setError("Сначала добавьте щиток.");
      return;
    }
    if (!typeSelected) {
      setError("Выберите тип техники или укажите свой вариант.");
      return;
    }
    if (customKindMode && !customKindName.trim()) {
      setError("Укажите название типа техники.");
      return;
    }
    if (!resolvedBrand) {
      setError("Укажите производителя.");
      return;
    }
    if (!resolvedModel) {
      setError("Укажите модель.");
      return;
    }
    if (usingCatalogModel && detailsLoading) {
      setError("Подождите, загружаются характеристики…");
      return;
    }

    if (usingCatalogModel && selectedModel && kind) {
      const powerW = details?.powerW ?? undefined;
      const specs = buildApplianceSpecsSnapshot({
        powerW: details?.powerW ?? null,
        specs: details?.specs ?? [],
      });
      const manuals = buildApplianceManualsSnapshot({
        manuals: details?.manuals ?? [],
      });

      const appliance: HomeAppliance = {
        id: initialAppliance?.id ?? createApplianceId(),
        kind,
        title: selectedModel.brand,
        brand: selectedModel.brand,
        model: selectedModel.modelName || selectedModel.productCode,
        brandLogoUrl: details?.brandLogoUrl ?? undefined,
        productImageUrl: details?.productImageUrl ?? undefined,
        powerW,
        catalogId: `icecat:${selectedModel.id}`,
        specs,
        manuals,
        createdAt: initialAppliance?.createdAt ?? new Date().toISOString(),
      };
      onSave(panelId, appliance);
      return;
    }

    const saveKind = customKindMode ? ("other" as const) : kind!;
    const specs = details?.matched
      ? buildApplianceSpecsSnapshot({
          powerW: details.powerW,
          specs: details.specs,
        })
      : undefined;
    const manuals =
      details?.matched && details.manuals.length > 0
        ? buildApplianceManualsSnapshot({ manuals: details.manuals })
        : undefined;
    const appliance: HomeAppliance = {
      id: initialAppliance?.id ?? createApplianceId(),
      kind: saveKind,
      title: customKindMode ? customKindName.trim() : resolvedBrand,
      brand: resolvedBrand,
      model: resolvedModel,
      brandLogoUrl: details?.brandLogoUrl ?? undefined,
      productImageUrl: details?.productImageUrl ?? undefined,
      powerW: details?.powerW ?? undefined,
      specs,
      manuals,
      createdAt: initialAppliance?.createdAt ?? new Date().toISOString(),
    };
    onSave(panelId, appliance);
  };

  const canSave =
    Boolean(panelId) &&
    typeSelected &&
    (!customKindMode || Boolean(customKindName.trim())) &&
    Boolean(resolvedBrand) &&
    Boolean(resolvedModel) &&
    (!usingCatalogModel || !detailsLoading);

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
            <h2 className="ty-heading">
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
              <span className="mb-1.5 block ty-note">
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
            {!editing ? (
              <div className="mb-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannerOpen(true);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-black/8 bg-zinc-50 px-4 py-3 ty-label text-zinc-800 transition-colors hover:bg-zinc-100"
                >
                  <ScanBarcode className="h-5 w-5" />
                  Сканировать штрихкод
                </button>
                <p className="px-1 ty-note text-zinc-500">
                  Наведите камеру на линейный штрихкод с упаковки — код
                  определится сам. Можно ввести цифры вручную.
                </p>
              </div>
            ) : null}

            {barcodeBanner ? (
              <div
                className={
                  barcodeCatalogPick
                    ? "mb-4 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 ty-note text-amber-900"
                    : "mb-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-3 py-2 ty-note text-emerald-800"
                }
              >
                {barcodeBanner}
              </div>
            ) : null}

            {barcodeCatalogPick ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block ty-label text-zinc-500">
                    Тип техники
                  </span>
                  <select
                    value={kind ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value || !isCatalogApplianceKind(value)) return;
                      selectKind(value, { fromAllProducts: true });
                    }}
                    className={selectClassName}
                  >
                    <option value="">Выберите тип…</option>
                    {FULL_CATALOG_KIND_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeCatalogPick(false);
                    setBarcodeBanner(null);
                  }}
                  className="inline-flex items-center gap-1.5 ty-label text-zinc-600 hover:text-zinc-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  К обычному выбору
                </button>
              </div>
            ) : customKindMode ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={exitCustomKindMode}
                  className="inline-flex items-center gap-1.5 ty-label text-zinc-600 hover:text-zinc-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  К выбору типа
                </button>
                <label className="block">
                  <span className="mb-1.5 block ty-label text-zinc-500">
                    Тип
                  </span>
                  <input
                    type="text"
                    value={customKindName}
                    onChange={(e) => {
                      setCustomKindName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Например, морозильник"
                    className={selectClassName}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block ty-label text-zinc-500">
                    Производитель
                  </span>
                  <input
                    type="text"
                    value={customBrandName}
                    onChange={(e) => {
                      setCustomBrandName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Название производителя"
                    className={selectClassName}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block ty-label text-zinc-500">
                    Модель
                  </span>
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => {
                      setCustomModelName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Модель или артикул"
                    className={selectClassName}
                  />
                </label>
              </div>
            ) : (
              <>
                <p className="mb-3 ty-label text-zinc-500">
                  Тип техники
                </p>

                {otherKindsOpen ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setOtherKindsOpen(false);
                    setAllProductsOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 ty-label text-zinc-600 hover:text-zinc-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  К основным типам
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  {OTHER_CATALOG_KIND_OPTIONS.map((item) => {
                    const Icon = applianceKindIcon(item.id);
                    const selected = !customKindMode && kind === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectKind(item.id)}
                        className={kindCardClass(selected)}
                      >
                        <span className={kindIconWrapClass(selected)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-[0.8125rem] font-semibold leading-snug text-zinc-900">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setAllProductsOpen(true);
                      setCustomKindMode(false);
                      setError(null);
                    }}
                    className={kindCardClass(allProductsOpen && !customKindMode)}
                  >
                    <span className={kindIconWrapClass(allProductsOpen && !customKindMode)}>
                      {(() => {
                        const Icon = applianceKindIcon("all-products-picker");
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </span>
                    <span className="text-[0.8125rem] font-semibold leading-snug text-zinc-900">
                      Все товары
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={selectCustomKind}
                    className={kindCardClass(customKindMode)}
                  >
                    <span className={kindIconWrapClass(customKindMode)}>
                      {(() => {
                        const Icon = applianceKindIcon("other-picker");
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </span>
                    <span className="text-[0.8125rem] font-semibold leading-snug text-zinc-900">
                      Свой вариант
                    </span>
                  </button>
                </div>
                {allProductsOpen && (
                  <label className="block">
                    <span className="mb-1.5 block ty-label text-zinc-500">
                      Выберите тип из полного каталога
                    </span>
                    <select
                      value={kind ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (!value || !isCatalogApplianceKind(value)) return;
                        selectKind(value, { fromAllProducts: true });
                      }}
                      className={selectClassName}
                    >
                      <option value="">Тип техники…</option>
                      {FULL_CATALOG_KIND_OPTIONS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {PRIMARY_CATALOG_KIND_OPTIONS.map((item) => {
                  const Icon = applianceKindIcon(item.id);
                  const selected = !customKindMode && kind === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectKind(item.id)}
                      className={kindCardClass(selected)}
                    >
                      <span className={kindIconWrapClass(selected)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[0.8125rem] font-semibold leading-snug text-zinc-900">
                        {item.title}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setOtherKindsOpen(true);
                    setAllProductsOpen(false);
                    setError(null);
                  }}
                  className={kindCardClass(otherKindSelected)}
                >
                  <span className={kindIconWrapClass(otherKindSelected)}>
                    {(() => {
                      const Icon = otherKindSelected
                        ? applianceKindIcon(kind!)
                        : applianceKindIcon("other-picker");
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </span>
                  <span className="text-[0.8125rem] font-semibold leading-snug text-zinc-900">
                    {otherKindSelected && kind
                      ? catalogKindTitle(kind)
                      : "Другое"}
                  </span>
                </button>
              </div>
            )}
              </>
            )}

            <AnimatePresence initial={false}>
              {!customKindMode && typeSelected && (
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
                    <span className="mb-1.5 block ty-label text-zinc-500">
                      Производитель
                    </span>
                    <select
                      value={brand ?? ""}
                      disabled={brandsLoading}
                      onChange={(e) => {
                        const value = e.target.value || null;
                        setBrand(value);
                        setModelId(null);
                        setDetails(null);
                        setCustomBrandName("");
                        setCustomModelName("");
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
                      <option value={CUSTOM_BRAND}>Свой вариант…</option>
                    </select>
                  </label>

                  {brand === CUSTOM_BRAND && (
                    <label className="block">
                      <span className="mb-1.5 block ty-label text-zinc-500">
                        Свой производитель
                      </span>
                      <input
                        type="text"
                        value={customBrandName}
                        onChange={(e) => {
                          setCustomBrandName(e.target.value);
                          setError(null);
                        }}
                        placeholder="Название производителя"
                        className={selectClassName}
                      />
                    </label>
                  )}

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
                          <span className="mb-1.5 block ty-label text-zinc-500">
                            Модель
                          </span>
                          <select
                            value={modelId ?? ""}
                            disabled={
                              brand !== CUSTOM_BRAND &&
                              (modelsLoading || models.length === 0)
                            }
                            onChange={(e) => {
                              setModelId(e.target.value || null);
                              setCustomModelName("");
                              setError(null);
                            }}
                            className={selectClassName}
                          >
                            <option value="">
                              {brand === CUSTOM_BRAND
                                ? "Выберите модель"
                                : modelsLoading
                                  ? "Загрузка…"
                                  : "Выберите модель"}
                            </option>
                            {models.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.modelName || item.productCode}
                              </option>
                            ))}
                            <option value={CUSTOM_MODEL}>Свой вариант…</option>
                          </select>
                        </label>

                        {modelId === CUSTOM_MODEL && (
                          <label className="mt-4 block">
                            <span className="mb-1.5 block ty-label text-zinc-500">
                              Своя модель
                            </span>
                            <input
                              type="text"
                              value={customModelName}
                              onChange={(e) => {
                                setCustomModelName(e.target.value);
                                setError(null);
                              }}
                              placeholder="Модель или артикул"
                              className={selectClassName}
                            />
                          </label>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-black/[0.06] px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {(usingCatalogModel && selectedModel) ||
            (!usingCatalogModel && !customKindMode && resolvedBrand && resolvedModel) ? (
              <div className="mb-3 space-y-1 text-center ty-note">
                <p>
                  {usingCatalogModel && selectedModel
                    ? `${selectedModel.brand} ${selectedModel.modelName || selectedModel.productCode}`
                    : `${resolvedBrand} ${resolvedModel}`}
                </p>
                {detailsLoading && <p>Загружаем характеристики…</p>}
                {!detailsLoading && details?.matched && details.specs.length > 0 && (
                  <p className="text-emerald-700">
                    Найдено характеристик: {details.specs.length}
                    {details.powerW != null
                      ? ` · ${formatAppliancePower(details.powerW)}`
                      : ""}
                  </p>
                )}
                {!detailsLoading &&
                  details &&
                  !details.matched &&
                  icecatStatusMessage(details.status, details.statusDetail) && (
                    <p className="text-amber-800">
                      {icecatStatusMessage(details.status, details.statusDetail)}
                    </p>
                  )}
                {!detailsLoading && details?.matched && details.specs.length === 0 && (
                  <p>Характеристики не указаны в каталоге</p>
                )}
              </div>
            ) : null}
            {customKindMode &&
              customKindName.trim() &&
              resolvedBrand &&
              resolvedModel && (
                <div className="mb-3 text-center ty-note">
                  <p>
                    {customKindName.trim()} · {resolvedBrand} {resolvedModel}
                  </p>
                </div>
              )}
            {error && (
              <p className="mb-2 text-center ty-note text-rose-600">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={!canSave}
              onClick={save}
            >
              <Check className="h-5 w-5" />
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    {scannerOpen ? (
      <ApplianceBarcodeScanner
        onClose={() => setScannerOpen(false)}
        onFound={applyBarcodeResult}
        onAddManually={applyBarcodeNotFound}
      />
    ) : null}
    </Portal>
  );
}
