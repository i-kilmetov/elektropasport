"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, Navigation, X } from "lucide-react";
import { AddressSuggestField } from "@/components/ui/address-suggest-field";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import {
  geolocateAddress,
  requestUserGeolocation,
} from "@/lib/address-suggest-client";
import { filterCities } from "@/lib/cities";
import { hasHouse, type AddressSuggestion, type GeolocatedAddress } from "@/lib/dadata";
import { isMoscow, normalizeCityName } from "@/lib/lead-services";

type Phase = "requesting" | "resolving" | "confirm" | "error" | "manual";

export function PanelHouseAddressSheet({
  open,
  saving = false,
  saved = false,
  error = null,
  onClose,
  onConfirm,
}: {
  open: boolean;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (payload: {
    city: string;
    address: string;
    fiasId?: string;
    street?: string;
    house?: string;
    block?: string;
    buildingYear?: number;
  }) => void | Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("requesting");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoAddress, setGeoAddress] = useState<GeolocatedAddress | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [citySelected, setCitySelected] = useState<string | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSelected, setAddressSelected] = useState<AddressSuggestion | null>(
    null,
  );

  const cityTrimmed = cityQuery.trim();
  const citySuggestions = useMemo(
    () => (cityTrimmed.length >= 2 ? filterCities(cityTrimmed) : []),
    [cityTrimmed],
  );
  const cityExact = citySuggestions.find(
    (city) => city.toLowerCase() === cityTrimmed.toLowerCase(),
  );
  const city = citySelected ?? cityExact ?? null;
  const cityLabel = city ? normalizeCityName(city) : "";
  const useMoscow = isMoscow(cityLabel);
  const addressTrimmed = addressQuery.trim();
  const addressReady =
    addressSelected != null &&
    addressSelected.value === addressTrimmed &&
    hasHouse(addressSelected);
  const canSubmitManual = Boolean(city && addressReady && !saving);
  const geoCity = geoAddress ? normalizeCityName(geoAddress.city) : "";

  const runLocate = useCallback(async () => {
    setPhase("requesting");
    setGeoError(null);
    setGeoAddress(null);
    try {
      const coords = await requestUserGeolocation();
      setPhase("resolving");
      const resolved = await geolocateAddress(coords.lat, coords.lon);
      setGeoAddress(resolved);
      setPhase("confirm");
    } catch (err) {
      setGeoError(
        err instanceof Error ? err.message : "Не удалось определить адрес",
      );
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!open || saved) return;
    setCityQuery("");
    setCitySelected(null);
    setAddressQuery("");
    setAddressSelected(null);
    void runLocate();
  }, [open, saved, runLocate]);

  const confirmGeo = () => {
    if (!geoAddress || saving) return;
    onConfirm({
      city: geoCity,
      address: geoAddress.value,
      fiasId: geoAddress.houseFiasId ?? geoAddress.fiasId,
      street: geoAddress.street,
      house: geoAddress.house,
      block: geoAddress.block,
    });
  };

  const goManual = (prefillFromGeo = false) => {
    if (prefillFromGeo && geoAddress) {
      setCitySelected(geoCity);
      setCityQuery(geoCity);
      setAddressQuery(geoAddress.value);
      setAddressSelected(null);
    }
    setPhase("manual");
  };

  if (!open) return null;

  if (saved) {
    return (
      <Portal>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
              <MapPin className="h-7 w-7" />
            </div>
            <h3 className="text-[20px] font-semibold text-zinc-900">
              Адрес сохранён
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">
              Данные дома записаны. Можно продолжать работу со щитком.
            </p>
          </motion.div>
        </motion.div>
      </Portal>
    );
  }

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[20px] font-semibold text-zinc-900">
                Адрес дома
              </h3>
              <p className="mt-1 text-[14px] leading-relaxed text-zinc-500">
                {phase === "confirm"
                  ? "Проверьте, верно ли определился дом по геопозиции."
                  : phase === "manual"
                    ? useMoscow
                      ? "Укажите улицу и дом."
                      : "Укажите город, улицу и дом."
                    : "Сначала определим адрес автоматически — как при вызове помощи."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {(phase === "requesting" || phase === "resolving") && (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border border-black/8 bg-zinc-50 px-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-700">
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
            </div>
          )}

          {phase === "confirm" && geoAddress && (
            <button
              type="button"
              onClick={() => goManual(true)}
              className="w-full rounded-[20px] border border-black/8 bg-zinc-50 p-4 text-left"
            >
              <p className="text-[13px] font-medium text-zinc-500">{geoCity}</p>
              <p className="mt-1 text-[16px] font-semibold leading-snug text-zinc-900">
                {geoAddress.value}
              </p>
              <p className="mt-2 text-[13px] text-zinc-500">
                Нажмите, чтобы исправить
              </p>
            </button>
          )}

          {phase === "error" && (
            <div className="rounded-[20px] border border-black/8 bg-zinc-50 p-4">
              <p className="text-[15px] font-medium text-zinc-900">
                Не удалось определить адрес автоматически
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
                {geoError ?? "Попробуйте ещё раз или укажите адрес вручную."}
              </p>
            </div>
          )}

          {phase === "manual" && (
            <>
              <label className="relative mb-3 block">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setCitySelected(null);
                    setAddressQuery("");
                    setAddressSelected(null);
                  }}
                  placeholder="Город"
                  autoComplete="off"
                  className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 pl-11 pr-4 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                />
              </label>

              {citySuggestions.length > 0 && !city && (
                <ul className="mb-4 max-h-36 overflow-y-auto rounded-[16px] border border-black/6 bg-zinc-50">
                  {citySuggestions.slice(0, 8).map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-[14px] text-zinc-800 hover:bg-white"
                        onClick={() => {
                          setCitySelected(item);
                          setCityQuery(item);
                        }}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {city && (
                <AddressSuggestField
                  city={cityLabel}
                  value={addressQuery}
                  source={useMoscow ? "moscow" : "dadata"}
                  houseOnly
                  onChange={(next) => {
                    setAddressQuery(next);
                    if (addressSelected && next.trim() !== addressSelected.value) {
                      setAddressSelected(null);
                    }
                  }}
                  onSelect={(item) => setAddressSelected(item)}
                  placeholder="Улица и номер дома"
                />
              )}
            </>
          )}

          {error && (
            <p className="mt-4 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {phase === "confirm" && geoAddress && (
              <>
                <Button
                  type="button"
                  className="w-full"
                  disabled={saving}
                  onClick={confirmGeo}
                >
                  {saving ? "Сохраняем…" : "Да, этот адрес"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => goManual(true)}
                  disabled={saving}
                >
                  Указать вручную
                </Button>
              </>
            )}

            {(phase === "requesting" || phase === "resolving" || phase === "error") && (
              <>
                {phase === "error" && (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => void runLocate()}
                    disabled={saving}
                  >
                    Повторить
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => goManual(false)}
                  disabled={saving}
                >
                  Указать вручную
                </Button>
              </>
            )}

            {phase === "manual" && (
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={saving}
                >
                  Позже
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!canSubmitManual}
                  onClick={() => {
                    if (!canSubmitManual || !city) return;
                    onConfirm({
                      city: cityLabel,
                      address: addressSelected?.value ?? addressTrimmed,
                      fiasId:
                        addressSelected?.houseFiasId ?? addressSelected?.fiasId,
                      street: addressSelected?.street,
                      house: addressSelected?.house,
                      block: addressSelected?.block,
                      buildingYear: addressSelected?.buildingYear,
                    });
                  }}
                >
                  {saving ? "Сохраняем…" : "Сохранить"}
                </Button>
              </div>
            )}

            {phase !== "manual" && (
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="w-full py-1 text-center text-[14px] font-medium text-zinc-500"
              >
                Позже
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
