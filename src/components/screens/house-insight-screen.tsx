"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Cable,
  Phone,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
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
  onBack,
  onCallMaster,
}: {
  city: string;
  address: string;
  fiasId?: string | null;
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
    void lookupHouseInsight({ city, address, fiasId })
      .then((next) => {
        if (!cancelled) setInsight(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setInsight(null);
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось получить данные о доме",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, address, fiasId]);

  const eraTone =
    insight?.electrical.era === "legacy"
      ? "bg-amber-50 text-amber-950"
      : insight?.electrical.era === "modern"
        ? "bg-emerald-50 text-emerald-950"
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
        <h1 className="text-[20px] font-semibold text-zinc-900">Ваш дом</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        Что известно по адресу
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-600">
        {address}
      </p>

      {loading && (
        <GlassCard className="mb-4 p-5">
          <p className="text-[15px] text-zinc-600">
            Смотрим год дома и управляющую компанию…
          </p>
        </GlassCard>
      )}

      {!loading && error && (
        <GlassCard className="mb-4 border border-amber-200/80 bg-amber-50 p-5">
          <p className="text-[15px] leading-relaxed text-amber-950">{error}</p>
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
              <span className="text-[13px] font-medium uppercase tracking-wide">
                Год постройки
              </span>
            </div>
            <p className="text-[28px] font-bold tracking-tight text-zinc-900">
              {formatBuildingYear(insight.buildingYear)}
            </p>
            {insight.operationYear != null &&
              insight.operationYear !== insight.buildingYear && (
                <p className="mt-1 text-[13px] text-zinc-500">
                  Введён в эксплуатацию: {insight.operationYear} г.
                </p>
              )}
          </GlassCard>

          <GlassCard className={cn("p-5", eraTone)}>
            <div className="mb-2 flex items-center gap-2 opacity-70">
              <Cable className="h-4 w-4" />
              <span className="text-[13px] font-medium uppercase tracking-wide">
                Электрика
              </span>
            </div>
            <p className="text-[18px] font-semibold leading-snug">
              {insight.electrical.title}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed opacity-90">
              {insight.electrical.description}
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Phone className="h-4 w-4" />
              <span className="text-[13px] font-medium uppercase tracking-wide">
                Управляющая компания
              </span>
            </div>
            {insight.management ? (
              <>
                <p className="text-[17px] font-semibold leading-snug text-zinc-900">
                  {insight.management.name}
                </p>
                {insight.management.phone ? (
                  <a
                    href={`tel:${insight.management.phone.replace(/[^\d+]/g, "")}`}
                    className="mt-2 inline-flex text-[16px] font-medium text-sky-700"
                  >
                    {insight.management.phone}
                  </a>
                ) : (
                  <p className="mt-2 text-[14px] text-zinc-500">
                    Телефон в реестре не указан
                  </p>
                )}
                <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">
                  Если проблема за пределами квартиры (этажный щит, стояк,
                  ввод) — звоните в УК.
                  {insight.managementType
                    ? ` Форма управления: ${insight.managementType}.`
                    : ""}
                </p>
              </>
            ) : (
              <p className="text-[15px] leading-relaxed text-zinc-600">
                В базе HouseScore по этому дому нет записи об УК (год при этом
                может быть). У ПИК и других застройщиков контакты часто есть в
                квитанции или в приложении УК — если проблема на стояке или в
                этажном щите, пишите туда.
              </p>
            )}
          </GlassCard>
        </div>
      )}

      <div className="mt-auto pt-6">
        <Button className="w-full" size="lg" onClick={onCallMaster}>
          <Wrench className="mr-2 h-5 w-5" />
          Вызвать мастера в Током
        </Button>
      </div>
    </motion.section>
  );
}
