"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticImpact } from "@/lib/haptics";
import {
  hasHouse,
  type AddressSuggestion,
} from "@/lib/dadata";
import { suggestAddresses } from "@/lib/user-data";
import { cn } from "@/lib/utils";

export function AddressSuggestField({
  city,
  value,
  onChange,
  onSelect,
  onLookupError,
  placeholder = "Улица, дом",
}: {
  city: string;
  value: string;
  onChange: (next: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  onLookupError?: (message: string | null) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      onLookupError?.(null);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void suggestAddresses(query, city)
        .then((next) => {
          if (requestId.current !== id) return;
          setSuggestions(next);
          setError(null);
          onLookupError?.(null);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (requestId.current !== id) return;
          setSuggestions([]);
          const message =
            err instanceof Error ? err.message : "Не удалось загрузить адреса";
          setError(message);
          onLookupError?.(message);
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, city]);

  return (
    <div>
      <label className="relative block">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 pl-11 pr-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
        />
      </label>

      {loading && (
        <p className="mt-2 text-[13px] text-zinc-400">Ищем адрес…</p>
      )}
      {error && !loading && (
        <p className="mt-2 text-[13px] text-rose-600">{error}</p>
      )}

      {open && suggestions.length > 0 && (
        <GlassCard className="mt-3 overflow-hidden p-0">
          <ul className="max-h-[40vh] overflow-y-auto">
            {suggestions.map((item) => (
              <li key={`${item.fiasId ?? item.value}-${item.value}`}>
                <button
                  type="button"
                  onClick={() => {
                    hapticImpact("light");
                    onChange(item.value);
                    onSelect(item);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-4 py-3.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <span className="text-[15px] font-medium text-zinc-900">
                    {item.value}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[12px]",
                      hasHouse(item) ? "text-zinc-400" : "text-amber-700",
                    )}
                  >
                    {hasHouse(item)
                      ? "Дом найден в адресном реестре"
                      : "Уточните номер дома"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
