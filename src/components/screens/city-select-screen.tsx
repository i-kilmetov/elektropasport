"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, MapPin } from "lucide-react";
import { MASTER_YELLOW_BTN } from "@/components/master-apply/master-apply-frame";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticImpact } from "@/lib/haptics";
import { suggestCities } from "@/lib/address-suggest-client";
import { filterCities } from "@/lib/cities";
import type { CitySuggestion } from "@/lib/dadata";
import { isMoscow } from "@/lib/lead-services";
import { cn } from "@/lib/utils";

function localFallback(query: string): CitySuggestion[] {
  return filterCities(query, 10).map((name) => ({ name, label: name }));
}

export function CitySelectScreen({
  onBack,
  onConfirm,
  title = "Ваш город",
  description = "Начните вводить название — подскажем города по всей России.",
  moscowHint,
  tone = "light",
}: {
  onBack: () => void;
  onConfirm: (city: string) => void;
  title?: string;
  description?: string;
  moscowHint?: string;
  tone?: "light" | "dark";
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CitySuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const dark = tone === "dark";

  const trimmed = query.trim();
  const showSuggestions = trimmed.length >= 2;

  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void suggestCities(trimmed)
        .then((next) => {
          if (requestId.current !== id) return;
          setSuggestions(next.length > 0 ? next : localFallback(trimmed));
        })
        .catch(() => {
          if (requestId.current !== id) return;
          setSuggestions(localFallback(trimmed));
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [showSuggestions, trimmed]);

  const exactMatch =
    suggestions.find(
      (city) => city.name.toLowerCase() === trimmed.toLowerCase(),
    ) ??
    suggestions.find(
      (city) => city.label.toLowerCase() === trimmed.toLowerCase(),
    ) ??
    null;
  const chosen = selected ?? exactMatch ?? null;

  const pickCity = (city: CitySuggestion) => {
    hapticImpact("light");
    setSelected(city);
    setQuery(city.name);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className={cn(
        "flex flex-col",
        dark
          ? "h-full min-h-0 flex-1 overflow-hidden bg-[#111113] text-white"
          : "min-h-dvh px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]",
      )}
    >
      <div
        className={cn(
          dark &&
            "mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
        )}
      >
        <header className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              dark
                ? "border border-white/12 bg-white/5 text-white"
                : "border border-black/8 bg-zinc-100 text-zinc-900",
            )}
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            className={cn(
              "ty-title",
              dark ? "text-white" : "text-zinc-900",
            )}
          >
            Выбор города
          </h1>
        </header>

        <h2
          className={cn(
            "mb-2 ty-display",
            dark ? "text-white" : "text-zinc-900",
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            "mb-5 text-[15px]",
            dark ? "text-white/55" : "text-zinc-500",
          )}
        >
          {description}
        </p>

        <label className="relative mb-3 block">
          <MapPin
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
              dark ? "text-white/35" : "text-zinc-400",
            )}
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Например, Казань"
            autoComplete="off"
            className={cn(
              "h-14 w-full rounded-[20px] border pl-11 pr-4 text-[16px] outline-none",
              dark
                ? "border-white/12 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30"
                : "border-black/8 bg-zinc-50 text-zinc-900 backdrop-blur-xl placeholder:text-zinc-400 focus:border-zinc-300",
            )}
          />
        </label>

        {showSuggestions && (
          <GlassCard
            className={cn(
              "mb-4 overflow-hidden p-0",
              dark && "border-white/10 bg-white/[0.06] shadow-none",
            )}
          >
            {loading && suggestions.length === 0 ? (
              <p
                className={cn(
                  "px-4 py-5 text-[14px]",
                  dark ? "text-white/45" : "text-zinc-500",
                )}
              >
                Ищем город…
              </p>
            ) : (
              <ul className="max-h-[46vh] overflow-y-auto">
                {suggestions.length === 0 ? (
                  <li
                    className={cn(
                      "px-4 py-5 text-[14px]",
                      dark ? "text-white/45" : "text-zinc-500",
                    )}
                  >
                    Город пока не найден. Проверьте написание или попробуйте другой.
                  </li>
                ) : (
                  suggestions.map((city) => {
                    const active = chosen?.name === city.name &&
                      chosen?.region === city.region &&
                      chosen?.kladrId === city.kladrId;
                    return (
                      <li key={`${city.kladrId ?? city.fiasId ?? city.label}`}>
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            pickCity(city);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-3.5 text-left text-[16px] transition-colors",
                            active
                              ? dark
                                ? "bg-white/10 text-white"
                                : "bg-zinc-100 text-zinc-900"
                              : dark
                                ? "text-white/75 hover:bg-white/5"
                                : "text-zinc-700 hover:bg-zinc-50",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{city.name}</span>
                            {city.region && city.label !== city.name && (
                              <span
                                className={cn(
                                  "mt-0.5 block truncate text-[12px]",
                                  dark ? "text-white/40" : "text-zinc-400",
                                )}
                              >
                                {city.region}
                              </span>
                            )}
                          </span>
                          {active && (
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                dark ? "text-[#D3DA00]" : "text-zinc-700",
                              )}
                            />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </GlassCard>
        )}

        {chosen && isMoscow(chosen.name) && moscowHint && (
          <p
            className={cn(
              "mb-4 ty-body",
              dark ? "text-white/60" : "text-zinc-600",
            )}
          >
            {moscowHint}
          </p>
        )}

        <div className="mt-auto">
          <Button
            className={cn("w-full", dark && MASTER_YELLOW_BTN)}
            size="lg"
            disabled={!chosen}
            onClick={() => chosen && onConfirm(chosen.name)}
          >
            Продолжить
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
