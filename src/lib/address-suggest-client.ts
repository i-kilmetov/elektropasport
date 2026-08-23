import type { AddressSuggestion } from "@/lib/dadata";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";

const SUGGEST_TIMEOUT_MS = 12_000;

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
