"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildApplianceManualsSnapshot,
  buildApplianceSpecsSnapshot,
  extractPowerWattsFromSpecs,
  icecatStatusMessage,
  type LoadedProductDetails,
} from "@/lib/appliance-specs";
import {
  catalogKindTitle,
  formatAppliancePower,
  isCatalogApplianceKind,
} from "@/lib/home-appliances";
import type { HomeAppliance } from "@/types";

const selectClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none disabled:opacity-50";

const CUSTOM_BRAND = "__custom_brand__";
const CUSTOM_MODEL = "__custom_model__";

type IcecatModelOption = {
  id: string;
  brand: string;
  productCode: string;
  modelName: string;
};

type ProductDetails = LoadedProductDetails;

export function ApplianceBrandModelPicker({
  appliance,
  onSave,
}: {
  appliance: HomeAppliance;
  onSave: (next: HomeAppliance) => void;
}) {
  const catalogKind = isCatalogApplianceKind(appliance.kind)
    ? appliance.kind
    : null;

  const [brand, setBrand] = useState<string | null>(
    appliance.brand?.trim() || null,
  );
  const [modelId, setModelId] = useState<string | null>(
    appliance.catalogId?.startsWith("icecat:")
      ? appliance.catalogId.slice("icecat:".length)
      : null,
  );
  const [customBrandName, setCustomBrandName] = useState("");
  const [customModelName, setCustomModelName] = useState(
    appliance.model?.trim() ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [catalogReady, setCatalogReady] = useState(true);
  const [models, setModels] = useState<IcecatModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const selectedModel = models.find((item) => item.id === modelId) ?? null;
  const resolvedBrand =
    brand === CUSTOM_BRAND
      ? customBrandName.trim()
      : (brand?.trim() ?? customBrandName.trim());
  const resolvedModel =
    modelId === CUSTOM_MODEL
      ? customModelName.trim()
      : (selectedModel?.modelName || selectedModel?.productCode || customModelName).trim();
  const usingCatalogModel =
    Boolean(modelId) && modelId !== CUSTOM_MODEL && Boolean(selectedModel);

  useEffect(() => {
    if (!catalogKind) {
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
          `/api/appliances/icecat/brands?kind=${encodeURIComponent(catalogKind)}`,
        );
        if (!res.ok) throw new Error("Не удалось загрузить производителей");
        const data = (await res.json()) as { brands?: string[] };
        if (cancelled) return;
        setBrands(Array.isArray(data.brands) ? data.brands : []);
        setCatalogReady(true);
      } catch (err) {
        if (cancelled) return;
        setBrands([]);
        setCatalogReady(false);
        setError(
          err instanceof Error ? err.message : "Ошибка загрузки производителей",
        );
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogKind]);

  useEffect(() => {
    if (!catalogKind || !brand || brand === CUSTOM_BRAND) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/appliances/icecat/models?kind=${encodeURIComponent(catalogKind)}&brand=${encodeURIComponent(brand)}`,
        );
        if (!res.ok) throw new Error("Не удалось загрузить модели");
        const data = (await res.json()) as { models?: IcecatModelOption[] };
        if (cancelled) return;
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
  }, [brand, catalogKind]);

  useEffect(() => {
    if (usingCatalogModel && selectedModel) {
      let cancelled = false;
      setDetailsLoading(true);
      setDetails(null);
      const timer = window.setTimeout(() => {
        void (async () => {
          try {
            const res = await fetch(
              `/api/appliances/icecat/product?id=${encodeURIComponent(selectedModel.id)}`,
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
    }

    if (!catalogKind || !resolvedBrand || !resolvedModel) {
      setDetails(null);
      return;
    }

    let cancelled = false;
    setDetailsLoading(true);
    setDetails(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            kind: catalogKind,
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
            powerW:
              hit.powerW ??
              extractPowerWattsFromSpecs(hit.specs ?? []) ??
              null,
            specs: Array.isArray(hit.specs) ? hit.specs : [],
            manuals: Array.isArray(hit.manuals) ? hit.manuals : [],
            title: null,
            brandLogoUrl: hit.brandLogoUrl ?? null,
            productImageUrl: hit.productImageUrl ?? null,
            matched: true,
            status: data.icecatStatus,
            statusDetail: data.icecatDetail ?? null,
          });
        } catch {
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
  }, [catalogKind, resolvedBrand, resolvedModel, selectedModel, usingCatalogModel]);

  const save = () => {
    if (!resolvedBrand) {
      setError("Укажите производителя.");
      return;
    }
    if (!resolvedModel) {
      setError("Укажите модель.");
      return;
    }
    if (detailsLoading) {
      setError("Подождите, загружаются характеристики…");
      return;
    }

    if (usingCatalogModel && selectedModel && catalogKind) {
      const powerW = details?.powerW ?? undefined;
      const specs = buildApplianceSpecsSnapshot({
        powerW: details?.powerW ?? null,
        specs: details?.specs ?? [],
      });
      const manuals = buildApplianceManualsSnapshot(
        { manuals: details?.manuals ?? [] },
        `${selectedModel.brand} ${selectedModel.productCode}`,
      );
      onSave({
        ...appliance,
        kind: catalogKind,
        title: selectedModel.brand,
        brand: selectedModel.brand,
        model: selectedModel.modelName || selectedModel.productCode,
        brandLogoUrl: details?.brandLogoUrl ?? undefined,
        productImageUrl: details?.productImageUrl ?? undefined,
        powerW,
        catalogId: `icecat:${selectedModel.id}`,
        specs,
        manuals,
      });
      return;
    }

    onSave({
      ...appliance,
      kind: catalogKind ?? appliance.kind,
      title: catalogKind ? catalogKindTitle(catalogKind) : resolvedBrand,
      brand: resolvedBrand,
      model: resolvedModel,
      brandLogoUrl: details?.brandLogoUrl ?? appliance.brandLogoUrl,
      productImageUrl: details?.productImageUrl ?? appliance.productImageUrl,
      powerW: details?.powerW ?? undefined,
      specs: details?.matched
        ? buildApplianceSpecsSnapshot({
            powerW: details.powerW,
            specs: details.specs,
          })
        : appliance.specs,
      manuals:
        details?.matched && (details.manuals?.length ?? 0) > 0
          ? buildApplianceManualsSnapshot(
              { manuals: details.manuals },
              `${resolvedBrand} ${resolvedModel}`,
            )
          : appliance.manuals,
    });
  };

  const canSave =
    Boolean(resolvedBrand) &&
    Boolean(resolvedModel) &&
    !detailsLoading;

  const detailsHint =
    detailsLoading
      ? "Загружаем характеристики…"
      : details?.matched && (details.specs?.length ?? 0) > 0
        ? `Найдено характеристик: ${details.specs.length}${
            details.powerW != null
              ? ` · ${formatAppliancePower(details.powerW)}`
              : ""
          }`
        : icecatStatusMessage(details?.status, details?.statusDetail);

  if (!catalogKind) {
    return (
      <div className="space-y-4">
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
          <span className="mb-1.5 block ty-label text-zinc-500">Модель</span>
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
        {error && <p className="ty-note text-rose-600">{error}</p>}
        <Button className="w-full" disabled={!canSave} onClick={save}>
          <Check className="h-5 w-5" />
          Сохранить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!catalogReady && (
        <p className="rounded-[16px] bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Каталог производителей ещё не загружен. Попробуйте позже.
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
            {brandsLoading ? "Загрузка…" : "Выберите производителя"}
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
              <span className="mb-1.5 block ty-label text-zinc-500">Модель</span>
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

      {resolvedBrand && resolvedModel && detailsHint ? (
        <p
          className={
            details?.matched && (details.specs?.length ?? 0) > 0
              ? "ty-note text-emerald-700"
              : "ty-note text-amber-800"
          }
        >
          {detailsHint}
        </p>
      ) : null}

      {error && <p className="ty-note text-rose-600">{error}</p>}

      <Button className="w-full" disabled={!canSave} onClick={save}>
        <Check className="h-5 w-5" />
        Сохранить
      </Button>
    </div>
  );
}
