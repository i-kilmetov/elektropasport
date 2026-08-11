"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { filterCities } from "@/lib/cities";

export function CitySelectScreen({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: (city: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const trimmed = query.trim();
  const showSuggestions = trimmed.length >= 2;

  const suggestions = useMemo(
    () => (showSuggestions ? filterCities(trimmed) : []),
    [showSuggestions, trimmed],
  );

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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Выбор города</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-white">
        В каком городе установить щиток?
      </h2>
      <p className="mb-5 text-[15px] text-white/50">
        Введите минимум 2 буквы — появятся подходящие города-миллионники.
      </p>

      <label className="relative mb-3 block">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Например, Казань"
          autoComplete="off"
          className="h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.06] pl-11 pr-4 text-[16px] text-white outline-none backdrop-blur-xl placeholder:text-white/30 focus:border-[var(--accent)]/50"
        />
      </label>

      {showSuggestions && (
        <GlassCard className="mb-4 overflow-hidden p-0">
          <ul className="max-h-[46vh] overflow-y-auto">
            {suggestions.length === 0 ? (
              <li className="px-4 py-5 text-[14px] text-white/40">
                Город не найден в списке миллионников
              </li>
            ) : (
              suggestions.map((city) => {
                const active = selected === city;
                return (
                  <li key={city}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(city);
                        setQuery(city);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-[16px] transition-colors ${
                        active
                          ? "bg-[var(--accent)]/20 text-white"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <span>{city}</span>
                      {active && (
                        <Check className="h-4 w-4 text-[var(--accent)]" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </GlassCard>
      )}

      <div className="mt-auto">
        <Button
          className="w-full"
          size="lg"
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
        >
          Продолжить
        </Button>
      </div>
    </motion.section>
  );
}
