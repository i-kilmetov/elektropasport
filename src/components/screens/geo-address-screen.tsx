"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, MapPin, Navigation } from "lucide-react";
import { AddressSuggestField } from "@/components/ui/address-suggest-field";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  geolocateAddress,
  requestUserGeolocation,
} from "@/lib/address-suggest-client";
import { hasHouse, type AddressSuggestion, type GeolocatedAddress } from "@/lib/dadata";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";

type Phase = "requesting" | "resolving" | "confirm" | "error";

function toSuggestion(address: GeolocatedAddress): AddressSuggestion {
  return {
    value: address.value,
    unrestrictedValue: address.unrestrictedValue,
    fiasId: address.fiasId,
    houseFiasId: address.houseFiasId,
    streetFiasId: address.streetFiasId,
    fiasLevel: address.fiasLevel,
    house: address.house,
    street: address.street,
    flat: address.flat,
    block: address.block,
    building: address.building,
    city: address.city,
  };
}

export function GeoAddressScreen({
  onBack,
  onConfirm,
  onManual,
}: {
  onBack: () => void;
  onConfirm: (payload: {
    city: string;
    address: string;
    fiasId?: string;
    houseFiasId?: string;
  }) => void;
  onManual: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("requesting");
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<GeolocatedAddress | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const startedRef = useRef(false);

  const cityLabel = address ? normalizeCityName(address.city) : "";
  const useMoscow = address ? isMoscow(cityLabel) : false;
  const trimmed = query.trim();
  const editReady =
    (selected != null &&
      selected.value === trimmed &&
      hasHouse(selected)) ||
    (lookupFailed && trimmed.length >= 8);

  const runLocate = useCallback(async () => {
    setPhase("requesting");
    setError(null);
    setAddress(null);
    setEditing(false);
    setQuery("");
    setSelected(null);
    setLookupFailed(false);
    try {
      const coords = await requestUserGeolocation();
      setPhase("resolving");
      const resolved = await geolocateAddress(coords.lat, coords.lon);
      setAddress(resolved);
      setPhase("confirm");
      hapticImpact("light");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось определить адрес";
      setError(message);
      setPhase("error");
      hapticNotification("error");
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runLocate();
  }, [runLocate]);

  const beginManualEdit = () => {
    if (!address) {
      onManual();
      return;
    }
    setQuery(address.value);
    setSelected(toSuggestion(address));
    setLookupFailed(false);
    setEditing(true);
    hapticImpact("light");
  };

  const confirmEdited = () => {
    if (!address || !editReady) return;
    hapticImpact("medium");
    onConfirm({
      city: cityLabel,
      address: selected?.value ?? trimmed,
      fiasId: selected?.fiasId,
      houseFiasId: selected?.houseFiasId ?? selected?.fiasId,
    });
  };

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
        <h1 className="text-[20px] font-semibold text-zinc-900">Адрес</h1>
      </header>

      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-zinc-900">
        {phase === "confirm"
          ? editing
            ? "Уточните адрес"
            : "Это ваш адрес?"
          : "Определяем адрес"}
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-600">
        {phase === "confirm"
          ? editing
            ? "Исправьте адрес, если геопозиция определилась неточно."
            : "Проверьте, верно ли определился дом по геопозиции."
          : "Разрешите доступ к геопозиции — подставим адрес автоматически."}
      </p>

      {(phase === "requesting" || phase === "resolving") && (
        <GlassCard className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            {phase === "resolving" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Navigation className="h-6 w-6" />
            )}
          </div>
          <p className="text-[15px] font-medium text-zinc-900">
            {phase === "requesting"
              ? "Запрашиваем геопозицию…"
              : "Ищем адрес рядом с вами…"}
          </p>
          <p className="text-[13px] text-zinc-500">
            Обычно это занимает несколько секунд.
          </p>
        </GlassCard>
      )}

      {phase === "confirm" && address && !editing && (
        <button
          type="button"
          onClick={beginManualEdit}
          className="w-full text-left"
          aria-label="Исправить адрес"
        >
          <GlassCard className="space-y-4 p-5 transition-colors active:bg-zinc-50/80">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-zinc-500">
                  {cityLabel}
                </p>
                <p className="mt-1 text-[17px] font-semibold leading-snug text-zinc-900">
                  {address.value}
                </p>
                <p className="mt-2 text-[13px] text-zinc-500">
                  Нажмите, чтобы исправить
                </p>
              </div>
            </div>
          </GlassCard>
        </button>
      )}

      {phase === "confirm" && address && editing && (
        <AddressSuggestField
          city={cityLabel}
          value={query}
          source={useMoscow ? "moscow" : "dadata"}
          houseOnly
          onChange={(next) => {
            setQuery(next);
            if (selected && next.trim() !== selected.value) {
              setSelected(null);
            }
          }}
          onSelect={(item) => {
            setSelected(item);
            setLookupFailed(false);
          }}
          onLookupError={(message) => setLookupFailed(Boolean(message))}
          placeholder="Улица, дом"
        />
      )}

      {phase === "error" && (
        <GlassCard className="space-y-3 p-5">
          <p className="text-[15px] font-medium text-zinc-900">
            Не удалось определить адрес автоматически
          </p>
          <p className="text-[14px] leading-relaxed text-zinc-600">
            {error ?? "Попробуйте ещё раз или укажите адрес вручную."}
          </p>
        </GlassCard>
      )}

      <div className="mt-auto space-y-3 pt-6">
        {phase === "confirm" && address && !editing && (
          <>
            <Button
              className="w-full rounded-full"
              size="lg"
              onClick={() => {
                hapticImpact("medium");
                onConfirm({
                  city: cityLabel,
                  address: address.value,
                  fiasId: address.fiasId,
                  houseFiasId: address.houseFiasId ?? address.fiasId,
                });
              }}
            >
              Да, верно
            </Button>
            <Button
              className="w-full rounded-full"
              variant="secondary"
              size="lg"
              onClick={beginManualEdit}
            >
              Указать вручную
            </Button>
          </>
        )}

        {phase === "confirm" && address && editing && (
          <>
            <Button
              className="w-full rounded-full"
              size="lg"
              disabled={!editReady}
              onClick={confirmEdited}
            >
              Продолжить
            </Button>
            <Button
              className="w-full rounded-full"
              variant="secondary"
              size="lg"
              onClick={() => setEditing(false)}
            >
              Отмена
            </Button>
          </>
        )}

        {phase === "error" && (
          <>
            <Button
              className="w-full rounded-full"
              size="lg"
              onClick={() => void runLocate()}
            >
              Повторить
            </Button>
            <Button
              className="w-full rounded-full"
              variant="secondary"
              size="lg"
              onClick={onManual}
            >
              Указать вручную
            </Button>
          </>
        )}

        {(phase === "requesting" || phase === "resolving") && (
          <Button
            className="w-full rounded-full"
            variant="secondary"
            size="lg"
            onClick={onManual}
          >
            Указать вручную
          </Button>
        )}
      </div>
    </motion.section>
  );
}
