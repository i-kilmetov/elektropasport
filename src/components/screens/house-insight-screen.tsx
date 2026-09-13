"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Cable, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { formatRubPerKwh } from "@/lib/electricity-tariffs-format";
import {
  formatBuildingYear,
  type HouseInsight,
} from "@/lib/house-insight";
import { lookupHouseInsight } from "@/lib/user-data";
import { cn } from "@/lib/utils";

export function HouseInsightScreen({
  city,
  address,
  fiasId,
  buildingYear,
  street,
  house,
  block,
  onBack,
  onCallMaster,
}: {
  city: string;
  address: string;
  fiasId?: string | null;
  buildingYear?: number | null;
  street?: string | null;
  house?: string | null;
  block?: string | null;
  onBack: () => void;
  onCallMaster: () => void;
}) {
  const [insight, setInsight] = useState<HouseInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const next = await lookupHouseInsight({
          city,
          address,
          fiasId,
          buildingYear,
          street,
          house,
          block,
        });
        if (!cancelled) setInsight(next);
      } catch (err: unknown) {
        if (cancelled) return;
        setInsight(null);
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось получить данные о доме",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city, address, fiasId, buildingYear, street, house, block]);

  const eraTone =
    insight?.electrical.era === "legacy"
      ? "bg-amber-50 text-amber-950"
      : insight?.electrical.era === "transitional"
        ? "bg-amber-50/80 text-amber-950"
        : insight?.electrical.era === "modern"
          ? "bg-emerald-50 text-emerald-950"
          : "bg-zinc-100 text-zinc-900";

  const groundingTone =
    insight?.grounding.expectation === "expected"
      ? "bg-emerald-50 text-emerald-950"
      : insight?.grounding.expectation === "uncertain"
        ? "bg-amber-50 text-amber-950"
        : insight?.grounding.expectation === "none"
          ? "bg-rose-50 text-rose-950"
          : "bg-zinc-100 text-zinc-900";

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
        <h1 className="ty-title">Ваш дом</h1>
      </header>

      <h2 className="mb-2 ty-display text-zinc-900">
        Что известно по адресу
      </h2>
      <p className="mb-5 ty-body">
        {address}
      </p>

      {loading && (
        <GlassCard className="mb-4 p-5">
          <p className="ty-body">
            Смотрим год постройки дома…
          </p>
        </GlassCard>
      )}

      {!loading && error && (
        <GlassCard className="mb-4 border border-amber-200/80 bg-amber-50 p-5">
          <p className="ty-body text-amber-950">{error}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-amber-900/80">
            Всё равно можно вызвать мастера Током — он разберётся на месте.
          </p>
        </GlassCard>
      )}

      {!loading && insight && (
        <div className="flex flex-col gap-3">
          <GlassCard className="p-5">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Building2 className="h-4 w-4" />
              <span className="ty-label uppercase tracking-wide">
                Год постройки
              </span>
            </div>
            <p className="ty-display text-zinc-900">
              {formatBuildingYear(insight.buildingYear)}
            </p>
            {insight.buildingYear == null ? (
              <p className="mt-1 ty-meta">
                В открытых источниках год для этого дома не нашли
              </p>
            ) : insight.dataSource ? (
              <p className="mt-1 ty-meta">
                Источник: {insight.dataSource}
              </p>
            ) : null}
            {insight.walls ? (
              <p className="mt-2 ty-body text-zinc-800">{insight.walls}</p>
            ) : null}
          </GlassCard>

          {insight.management?.name ? (
            <GlassCard className="p-5">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Building2 className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">УК</span>
              </div>
              <p className="ty-body font-medium text-zinc-900">
                {insight.management.name}
              </p>
              {(insight.management.inn || insight.management.ogrn) && (
                <p className="mt-2 ty-note text-zinc-700">
                  {[
                    insight.management.inn
                      ? `ИНН ${insight.management.inn}`
                      : null,
                    insight.management.ogrn
                      ? `ОГРН ${insight.management.ogrn}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {insight.management.phone ? (
                <p className="mt-2">
                  <a
                    href={`tel:${insight.management.phone.replace(/[^\d+]/g, "")}`}
                    className="ty-body text-zinc-900 underline underline-offset-2"
                  >
                    {insight.management.phone}
                  </a>
                </p>
              ) : null}
              {insight.management.email ? (
                <p className="mt-1">
                  <a
                    href={`mailto:${insight.management.email}`}
                    className="ty-note text-zinc-800 underline underline-offset-2 break-all"
                  >
                    {insight.management.email}
                  </a>
                </p>
              ) : null}
            </GlassCard>
          ) : null}

          <GlassCard className={cn("p-5", eraTone)}>
            <div className="mb-2 flex items-center gap-2 opacity-70">
              <Cable className="h-4 w-4" />
              <span className="ty-label uppercase tracking-wide">
                Электрика
              </span>
            </div>
            <p className="ty-title leading-snug">
              {insight.electrical.title}
            </p>
            <p className="mt-2 ty-body opacity-90">
              {insight.electrical.description}
            </p>
          </GlassCard>

          <GlassCard className={cn("p-5", groundingTone)}>
            <div className="mb-2 flex items-center gap-2 opacity-70">
              <Shield className="h-4 w-4" />
              <span className="ty-label uppercase tracking-wide">
                Заземление
              </span>
            </div>
            <p className="ty-title leading-snug">
              {insight.grounding.title}
            </p>
            <p className="mt-2 ty-body opacity-90">
              {insight.grounding.summary}
            </p>
          </GlassCard>

          {insight.electricalOverhaul?.message ? (
            <GlassCard className="p-5">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Cable className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Капремонт электроснабжения
                </span>
              </div>
              <p className="ty-body text-zinc-800">
                {insight.electricalOverhaul.message}
              </p>
            </GlassCard>
          ) : null}

          {insight.electricityTariff ? (
            <GlassCard className="p-5">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Zap className="h-4 w-4" />
                <span className="ty-label uppercase tracking-wide">
                  Тариф на электроэнергию
                </span>
              </div>
              <p className="ty-body text-zinc-900">
                {insight.electricityTariff.regionLabel}
              </p>
              <p className="mt-1 ty-note text-zinc-600">
                Действует {insight.electricityTariff.periodLabel}
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="ty-note text-zinc-600">Одноставочный</span>
                  <span className="ty-body font-medium tabular-nums">
                    {formatRubPerKwh(insight.electricityTariff.urban.single)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="ty-note text-zinc-600">День / ночь</span>
                  <span className="ty-body font-medium tabular-nums">
                    {formatRubPerKwh(insight.electricityTariff.urban.dualDay)}
                    {" / "}
                    {formatRubPerKwh(insight.electricityTariff.urban.dualNight)}
                  </span>
                </div>
              </div>
              <p className="mt-2 ty-meta text-zinc-500">
                Город (газ / без электроплит). Подробнее — в карточке дома на
                схеме.
              </p>
            </GlassCard>
          ) : null}
        </div>
      )}

      <div className="mt-auto pt-6">
        <Button className="w-full rounded-full" size="lg" onClick={onCallMaster}>
          Далее
        </Button>
      </div>
    </motion.section>
  );
}
