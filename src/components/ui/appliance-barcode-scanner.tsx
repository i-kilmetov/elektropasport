"use client";

import { useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Ean13Example,
  EXAMPLE_EAN13,
} from "@/components/ui/ean13-example";
import { Portal } from "@/components/ui/portal";
import type { BarcodeLookupResponse } from "@/lib/appliance-barcode";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
] as const;

const TIPS = [
  "Линейный код с полосками и цифрами — не QR",
  "Чаще всего EAN-13: 13 цифр (в РФ часто 460–469…)",
  "Держите код ровно в кадре, без бликов",
];

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

function getNativeBarcodeDetector():
  | (new (options?: { formats?: string[] }) => BarcodeDetectorLike)
  | null {
  if (typeof window === "undefined") return null;
  const ctor = (
    window as unknown as {
      BarcodeDetector?: new (options?: {
        formats?: string[];
      }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  return ctor ?? null;
}

async function createBarcodeDetector(): Promise<BarcodeDetectorLike> {
  const Native = getNativeBarcodeDetector();
  if (Native) {
    try {
      return new Native({ formats: [...BARCODE_FORMATS] });
    } catch {
      return new Native();
    }
  }

  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
  try {
    return new BarcodeDetector({ formats: [...BARCODE_FORMATS] });
  } catch {
    return new BarcodeDetector();
  }
}

/** Same path as panel photo — native camera app, no live getUserMedia stream. */
function pickImageFile(options: {
  accept: string;
  capture?: boolean;
}): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept;
    if (options.capture) {
      input.setAttribute("capture", "environment");
    }
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0";

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(cleanupTimer);
      input.remove();
      resolve(file);
    };

    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    input.addEventListener("cancel", () => finish(null));

    document.body.appendChild(input);
    input.click();

    const cleanupTimer = window.setTimeout(() => {
      if (!settled && document.body.contains(input) && !input.files?.length) {
        finish(null);
      }
    }, 120_000);
  });
}

async function detectBarcodeFromFile(file: File): Promise<string | null> {
  const detector = await createBarcodeDetector();
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    const value = codes.find((item) => item.rawValue?.trim())?.rawValue;
    return value?.replace(/\D/g, "") || null;
  } finally {
    bitmap?.close();
  }
}

export function ApplianceBarcodeScanner({
  onClose,
  onFound,
}: {
  onClose: () => void;
  onFound: (result: BarcodeLookupResponse) => void;
}) {
  const [manualCode, setManualCode] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const lookupGtin = async (raw: string) => {
    if (lookingUp) return;
    setLookingUp(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/appliances/icecat/barcode?gtin=${encodeURIComponent(raw)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as BarcodeLookupResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Товар не найден");
      }
      onFound(data);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Не удалось найти товар",
      );
    } finally {
      setLookingUp(false);
    }
  };

  const openCamera = async () => {
    setLookupError(null);
    setCapturing(true);
    try {
      const file = await pickImageFile({
        accept: "image/*",
        capture: true,
      });
      if (!file) return;

      let code: string | null = null;
      try {
        code = await detectBarcodeFromFile(file);
      } catch {
        setLookupError(
          "Не удалось разобрать снимок. Попробуйте ещё раз или введите код вручную.",
        );
        return;
      }

      if (!code || code.length < 8) {
        setLookupError(
          "Штрихкод на фото не найден. Снимите ближе и ровнее или введите цифры вручную.",
        );
        return;
      }

      await lookupGtin(code);
    } finally {
      setCapturing(false);
    }
  };

  const busy = lookingUp || capturing;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-end bg-black/70 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6">
        <div className="mx-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white text-zinc-900 shadow-2xl lg:max-w-md lg:rounded-[28px]">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <div className="w-10" />
            <h2 className="ty-heading">Штрихкод</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
              aria-label="Закрыть"
              disabled={busy}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <h3 className="ty-title text-zinc-950">
                Сфотографируйте штрихкод
              </h3>
              <p className="mt-1.5 ty-body text-zinc-600">
                Как при съёмке щитка: сначала подсказка, потом системная камера.
              </p>
            </div>

            <div className="rounded-[20px] border border-black/8 bg-zinc-50 px-4 py-4">
              <p className="mb-3 text-center ty-label text-zinc-500">
                Как выглядит код (пример EAN-13)
              </p>
              <Ean13Example code={EXAMPLE_EAN13} />
              <p className="mt-3 text-center ty-note text-zinc-500">
                Полоски + цифры под ними. QR-код не подойдёт.
              </p>
            </div>

            <ul className="space-y-2.5">
              {TIPS.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-3 text-[14px] text-zinc-700"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            <label className="block">
              <span className="mb-1.5 block ty-label text-zinc-500">
                Или введите код вручную
              </span>
              <input
                inputMode="numeric"
                value={manualCode}
                disabled={busy}
                onChange={(event) => {
                  setManualCode(
                    event.target.value.replace(/\D/g, "").slice(0, 14),
                  );
                  setLookupError(null);
                }}
                placeholder={EXAMPLE_EAN13}
                className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </label>

            {lookupError ? (
              <p className="ty-note text-rose-600">{lookupError}</p>
            ) : null}
          </div>

          <div className="shrink-0 space-y-2 border-t border-black/6 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => void openCamera()}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lookingUp ? "Ищем модель…" : "Открываем камеру…"}
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Сфотографировать штрихкод
                </>
              )}
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={busy || manualCode.replace(/\D/g, "").length < 8}
              onClick={() => void lookupGtin(manualCode)}
            >
              {lookingUp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ищем…
                </>
              ) : (
                "Найти по коду"
              )}
            </Button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full py-2 text-center ty-subtitle text-zinc-500 transition-colors hover:text-zinc-800 disabled:opacity-40"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
