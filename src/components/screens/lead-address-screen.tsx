"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AddressSuggestField } from "@/components/ui/address-suggest-field";
import { Button } from "@/components/ui/button";
import { hasFlat, hasHouse, type AddressSuggestion } from "@/lib/dadata";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";

export type ConfirmedAddress = {
  value: string;
  fiasId?: string;
  houseFiasId?: string;
  street?: string;
  house?: string;
  block?: string;
  buildingYear?: number;
};

export function LeadAddressScreen({
  city,
  initialAddress,
  onBack,
  onConfirm,
  title = "Адрес",
  heading,
  description,
  requireApartment = true,
}: {
  city: string;
  initialAddress?: string;
  onBack: () => void;
  onConfirm: (address: ConfirmedAddress) => void;
  title?: string;
  heading?: string;
  description?: string;
  /** When false, house-level address is enough (no flat required). */
  requireApartment?: boolean;
}) {
  const [query, setQuery] = useState(initialAddress ?? "");
  const [selected, setSelected] = useState<AddressSuggestion | null>(
    initialAddress
      ? {
          value: initialAddress,
          unrestrictedValue: initialAddress,
          fiasLevel: 8,
        }
      : null,
  );
  const [apartments, setApartments] = useState<AddressSuggestion[]>([]);
  const [lookupFailed, setLookupFailed] = useState(false);

  const cityLabel = normalizeCityName(city);
  const useMoscow = isMoscow(cityLabel);
  const trimmed = query.trim();
  const needsApartment =
    requireApartment &&
    !useMoscow &&
    selected != null &&
    hasHouse(selected) &&
    !hasFlat(selected) &&
    apartments.length > 0;
  const ready =
    (selected != null &&
      selected.value === trimmed &&
      hasHouse(selected) &&
      !needsApartment) ||
    (lookupFailed && trimmed.length >= 8);

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
        <h1 className="text-[20px] font-semibold text-zinc-900">{title}</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        {heading ?? `Адрес в ${cityLabel}`}
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-600">
        {description ??
          (useMoscow
            ? "Укажите улицу и дом. Год постройки подтянем из открытых источников и оценим заземление."
            : "Укажите точный адрес: улица и дом. По году постройки подскажем, есть ли заземление.")}
      </p>

      <AddressSuggestField
        city={cityLabel}
        value={query}
        source={useMoscow ? "moscow" : "dadata"}
        houseOnly={!requireApartment || useMoscow}
        onChange={(next) => {
          setQuery(next);
          if (selected && next.trim() !== selected.value) {
            setSelected(null);
            setApartments([]);
          }
        }}
        onSelect={(item, extras) => {
          setSelected(item);
          setApartments(extras?.apartments ?? []);
          setLookupFailed(false);
        }}
        onLookupError={(message) => setLookupFailed(Boolean(message))}
        placeholder="Улица, дом"
      />

      {needsApartment && (
        <p className="mt-3 text-[13px] leading-relaxed text-amber-800">
          В этом доме есть квартиры в адресном реестре — выберите квартиру из
          списка.
        </p>
      )}

      <div className="mt-auto pt-6">
        <Button
          className="w-full"
          size="lg"
          disabled={!ready}
          onClick={() => {
            if (!ready) return;
            const item = selected;
            onConfirm({
              value: item?.value ?? trimmed,
              fiasId: item?.fiasId,
              houseFiasId: item?.houseFiasId ?? item?.fiasId,
              street: item?.street,
              house: item?.house,
              block: item?.block,
              buildingYear: item?.buildingYear,
            });
          }}
        >
          Продолжить
        </Button>
      </div>
    </motion.section>
  );
}
