"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticImpact } from "@/lib/haptics";
import {
  hasFlat,
  hasHouse,
  type AddressSuggestion,
} from "@/lib/dadata";
import { suggestAddresses } from "@/lib/address-suggest-client";
import { cn } from "@/lib/utils";

export function AddressSuggestField({
  city,
  value,
  onChange,
  onSelect,
  onLookupError,
  placeholder = "Улица, дом, квартира",
  source = "dadata",
  houseOnly = false,
  autoFocus = false,
  selectEndOnFocus = false,
}: {
  city: string;
  value: string;
  onChange: (next: string) => void;
  onSelect: (
    suggestion: AddressSuggestion,
    extras?: { apartments: AddressSuggestion[] },
  ) => void;
  onLookupError?: (message: string | null) => void;
  placeholder?: string;
  /** Moscow open data returns MKD houses with year from dommos passports. */
  source?: "dadata" | "moscow";
  /** Skip apartment drill-down (house-level sources only). */
  houseOnly?: boolean;
  autoFocus?: boolean;
  /** Place caret at end and scroll long values to the tail on focus. */
  selectEndOnFocus?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [apartments, setApartments] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const pickingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInputEnd = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
    el.scrollLeft = el.scrollWidth;
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => focusInputEnd());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, focusInputEnd]);

  useEffect(() => {
    if (pickingRef.current) {
      pickingRef.current = false;
      setLoading(false);
      return;
    }
    const query = value.trim();
    const minLen = source === "moscow" ? 3 : 2;
    if (query.length < minLen) {
      setSuggestions([]);
      setApartments([]);
      setLoading(false);
      setError(null);
      onLookupError?.(null);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void suggestAddresses(query, city, { source })
        .then((next) => {
          if (requestId.current !== id) return;
          setSuggestions(next);
          setApartments([]);
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
    }, 200);

    return () => window.clearTimeout(timer);
  }, [value, city, source]);

  const pickSuggestion = (
    event: PointerEvent<HTMLButtonElement>,
    item: AddressSuggestion,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    hapticImpact("light");
    pickingRef.current = true;
    onChange(item.value);

    if (houseOnly || source === "moscow" || hasFlat(item) || !hasHouse(item)) {
      setApartments([]);
      setOpen(false);
      onSelect(item, { apartments: [] });
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    void suggestAddresses(`${item.value} кв`, city, { source: "dadata" })
      .then((next) => {
        if (requestId.current !== id) return;
        const flats = next.filter(hasFlat);
        setApartments(flats);
        setError(null);
        onLookupError?.(null);
        onSelect(item, { apartments: flats });
        setOpen(flats.length > 0);
      })
      .catch((err: unknown) => {
        if (requestId.current !== id) return;
        setApartments([]);
        onSelect(item, { apartments: [] });
        setOpen(false);
        const message =
          err instanceof Error ? err.message : "Не удалось загрузить квартиры";
        setError(message);
        onLookupError?.(message);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  };

  const list = apartments.length > 0 ? apartments : suggestions;
  const hint =
    source === "moscow" &&
    value.trim().length >= 3 &&
    !loading &&
    !error
      ? list.length === 0
        ? "Ищем дом в открытых данных Москвы — уточните улицу и номер"
        : null
      : null;

  return (
    <div>
      <label className="relative block">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setApartments([]);
            setOpen(true);
            if (selectEndOnFocus) {
              requestAnimationFrame(() => {
                const el = inputRef.current;
                if (!el) return;
                el.scrollLeft = el.scrollWidth;
              });
            }
          }}
          onFocus={() => {
            if (selectEndOnFocus) focusInputEnd();
            if (list.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 pl-11 pr-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
        />
      </label>

      {loading && (
        <p className="mt-2 ty-meta">
          {source === "moscow"
            ? "Ищем дом в открытых данных Москвы…"
            : apartments.length > 0 || value.includes("кв")
              ? "Ищем квартиры…"
              : "Ищем адрес…"}
        </p>
      )}
      {error && !loading && (
        <p className="mt-2 ty-note text-rose-600">{error}</p>
      )}
      {hint && (
        <p className="mt-2 ty-meta">{hint}</p>
      )}

      {open && list.length > 0 && (
        <GlassCard className="mt-3 overflow-hidden p-0">
          {apartments.length > 0 && (
            <p className="border-b border-black/6 px-4 py-2 ty-badge text-zinc-500">
              Выберите квартиру в этом доме
            </p>
          )}
          {source === "moscow" && (
            <p className="border-b border-black/6 px-4 py-2 ty-badge text-zinc-500">
              Дома Москвы — выберите свой
            </p>
          )}
          <ul className="max-h-[40vh] overflow-y-auto">
            {list.map((item) => (
              <li key={`${item.fiasId ?? item.value}-${item.value}`}>
                <button
                  type="button"
                  onPointerDown={(event) => pickSuggestion(event, item)}
                  className="flex w-full flex-col items-start px-4 py-3.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <span className="ty-subtitle text-zinc-900">
                    {item.value}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[12px]",
                      source === "moscow"
                        ? "text-emerald-700"
                        : hasFlat(item)
                          ? "text-emerald-700"
                          : hasHouse(item)
                            ? "text-zinc-400"
                            : "text-amber-700",
                    )}
                  >
                    {source === "moscow"
                      ? item.buildingYear != null
                        ? `Год постройки: ${item.buildingYear}`
                        : "Дом в реестре Москвы"
                      : hasFlat(item)
                        ? "Квартира найдена в адресном реестре"
                        : hasHouse(item)
                          ? "Дом найден — уточните квартиру, если она есть"
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
