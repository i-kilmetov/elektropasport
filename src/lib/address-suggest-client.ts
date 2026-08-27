import type { AddressSuggestion, GeolocatedAddress } from "@/lib/dadata";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";

const SUGGEST_TIMEOUT_MS = 12_000;
const GEO_TIMEOUT_MS = 15_000;

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Ошибка ${res.status}`;
  } catch {
    return `Ошибка ${res.status}`;
  }
}

/** DaData address suggestions via /api/address-suggest (kept out of user-data bundle weight). */
export async function suggestAddresses(
  query: string,
  city: string,
  options?: { source?: "dadata" | "moscow" },
): Promise<AddressSuggestion[]> {
  if (!canUseServerAuth()) {
    throw new Error("Подсказки адресов доступны после входа через Telegram");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SUGGEST_TIMEOUT_MS,
  );

  try {
    const res = await fetch("/api/address-suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        query,
        city,
        source: options?.source ?? "dadata",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(await parseError(res));
    }

    const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
    return Array.isArray(data.suggestions) ? data.suggestions : [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Сервер долго не отвечает — попробуйте ещё раз");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export type UserGeolocation = { lat: number; lon: number };

export function isGeolocationAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

let activeWatchId: number | null = null;

function clearActiveWatch() {
  if (
    activeWatchId == null ||
    typeof navigator === "undefined" ||
    !navigator.geolocation
  ) {
    activeWatchId = null;
    return;
  }
  navigator.geolocation.clearWatch(activeWatchId);
  activeWatchId = null;
}

export function requestUserGeolocation(options?: {
  signal?: AbortSignal;
}): Promise<UserGeolocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Геолокация недоступна в этом браузере"));
      return;
    }

    if (options?.signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    let settled = false;
    let timeoutId = 0;

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      options?.signal?.removeEventListener("abort", onAbort);
      clearActiveWatch();
      action();
    };

    const onAbort = () => {
      settle(() => reject(new DOMException("Aborted", "AbortError")));
    };

    options?.signal?.addEventListener("abort", onAbort);
    clearActiveWatch();

    try {
      activeWatchId = navigator.geolocation.watchPosition(
        (position) => {
          settle(() =>
            resolve({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            }),
          );
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            settle(() => reject(new Error("Нужен доступ к геопозиции")));
            return;
          }
          if (error.code === error.TIMEOUT) {
            settle(() =>
              reject(new Error("Не удалось получить геопозицию вовремя")),
            );
            return;
          }
          settle(() => reject(new Error("Не удалось определить геопозицию")));
        },
        {
          enableHighAccuracy: true,
          timeout: GEO_TIMEOUT_MS,
          maximumAge: 0,
        },
      );
    } catch {
      settle(() => reject(new Error("Не удалось определить геопозицию")));
      return;
    }

    timeoutId = window.setTimeout(() => {
      settle(() =>
        reject(new Error("Не удалось получить геопозицию вовремя")),
      );
    }, GEO_TIMEOUT_MS);
  });
}

export async function geolocateAddress(
  lat: number,
  lon: number,
): Promise<GeolocatedAddress> {
  if (!canUseServerAuth()) {
    throw new Error("Определение адреса доступно после входа через Telegram");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SUGGEST_TIMEOUT_MS,
  );

  try {
    const res = await fetch("/api/address-geolocate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ lat, lon }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(await parseError(res));
    }

    const data = (await res.json()) as { address?: GeolocatedAddress };
    if (!data.address?.value || !data.address.city) {
      throw new Error("По вашей геопозиции адрес не найден");
    }
    return data.address;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Сервер долго не отвечает — попробуйте ещё раз");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
