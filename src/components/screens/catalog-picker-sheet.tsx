"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { BrandMark } from "@/components/icons/brand-mark";
import { DeviceMiniPreview } from "@/components/icons/device-face";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  deviceTypeToCategory,
  filterCatalogProducts,
  getCatalogBrands,
  productToDevice,
  type CatalogFilters,
} from "@/lib/device-catalog";
import { deviceTypeGuide, type DeviceGuideEntry } from "@/lib/panel-device-guide";
import { cn } from "@/lib/utils";
import type { DeviceType } from "@/types";

function guideTitle(type: DeviceType): string {
  if (type === "pe_bus" || type === "n_bus") return "Прибор";
  return (deviceTypeGuide[type] as DeviceGuideEntry).title;
}

const MODULE_OPTIONS = [1, 2, 3, 4] as const;

export function CatalogPickerSheet({
  type,
  open,
  onClose,
}: {
  type: DeviceType | null;
  open: boolean;
  onClose: () => void;
}) {
  const category = type ? deviceTypeToCategory(type) : null;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [brand, setBrand] = useState("all");
  const [modules, setModules] = useState<number | "all">("all");
  const [poles, setPoles] = useState("all");
  const [search, setSearch] = useState("");

  const brands = useMemo(
    () => (category ? getCatalogBrands(category) : []),
    [category],
  );

  const polesOptions = useMemo(() => {
    if (!category) return [];
    const items = filterCatalogProducts(category, {});
    return [...new Set(items.map((p) => p.poles))].sort();
  }, [category]);

  const products = useMemo(() => {
    if (!category) return [];
    const active: CatalogFilters = { search };
    if (brand !== "all") active.brand = brand;
    if (modules !== "all") active.modules = modules;
    if (poles !== "all") active.poles = poles;
    return filterCatalogProducts(category, active).slice(0, 80);
  }, [category, brand, modules, poles, search]);

  const title = type ? guideTitle(type) : "Каталог";

  return (
    <AnimatePresence>
      {open && type && category && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88dvh] w-full flex-col rounded-t-[28px] border border-white/10 bg-[#16161d]/98 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 pb-4 pt-5">
              <div>
                <h3 className="text-[20px] font-semibold text-white">{title}</h3>
                <p className="mt-1 text-[13px] text-white/45">
                  Примеры приборов из каталога — для ориентира при выборе
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-white/8 px-5 py-3">
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по модели, номиналу…"
                  className="h-10 min-w-0 flex-1 rounded-[14px] border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50"
                />
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border transition-colors",
                    filtersOpen
                      ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "border-white/10 bg-white/5 text-white/60",
                  )}
                  aria-label="Фильтры"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>

              {filtersOpen && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[11px] text-white/40">Бренд</span>
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="h-9 w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-2 text-[13px] text-white outline-none"
                    >
                      <option value="all">Все</option>
                      {brands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-white/40">Модули</span>
                    <select
                      value={String(modules)}
                      onChange={(e) =>
                        setModules(
                          e.target.value === "all"
                            ? "all"
                            : Number(e.target.value),
                        )
                      }
                      className="h-9 w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-2 text-[13px] text-white outline-none"
                    >
                      <option value="all">Все</option>
                      {MODULE_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 space-y-1">
                    <span className="text-[11px] text-white/40">Полюса</span>
                    <select
                      value={poles}
                      onChange={(e) => setPoles(e.target.value)}
                      className="h-9 w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-2 text-[13px] text-white outline-none"
                    >
                      <option value="all">Все</option>
                      {polesOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {products.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-white/40">
                  Ничего не найдено. Измените фильтры.
                </p>
              ) : (
                <ul className="space-y-3">
                  {products.map((product) => {
                    const preview = productToDevice(product, {
                      id: 0,
                      position: 0,
                      status: "verified",
                    });
                    const specs = Object.entries(product.characteristics).slice(
                      0,
                      4,
                    );
                    return (
                      <li key={product.id}>
                        <GlassCard className="flex gap-3 p-3">
                          <DeviceMiniPreview
                            device={preview}
                            scale={0.34}
                            brand={
                              <BrandMark
                                brandKey={product.brandKey}
                                brand={product.brand}
                              />
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-semibold text-white">
                              {product.displayName}
                            </div>
                            <div className="mt-0.5 text-[12px] text-white/45">
                              {product.brand} · {product.model}
                            </div>
                            <dl className="mt-2 space-y-1">
                              {specs.map(([key, value]) => (
                                <div
                                  key={key}
                                  className="flex gap-2 text-[11px] leading-snug"
                                >
                                  <dt className="shrink-0 text-white/35">
                                    {key}:
                                  </dt>
                                  <dd className="text-white/70">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        </GlassCard>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-white/8 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button className="w-full" variant="secondary" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
