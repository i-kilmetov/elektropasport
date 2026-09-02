"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Ean13Example,
  EXAMPLE_EAN13,
} from "@/components/ui/ean13-example";
import { Portal } from "@/components/ui/portal";
import type { BarcodeLookupResponse } from "@/lib/appliance-barcode";
import { cn } from "@/lib/utils";

const BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
] as const;

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

type LookupState =
  | { status: "idle" }
  | { status: "detected"; code: string }
  | { status: "looking"; code: string }
  | { status: "found"; code: string; result: BarcodeLookupResponse }
  | { status: "missing"; code: string; message: string }
  | { status: "error"; code: string; message: string };

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

function normalizeDetectedCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 14);
}

export function ApplianceBarcodeScanner({
  onClose,
  onFound,
  onAddManually,
}: {
  onClose: () => void;
  onFound: (result: BarcodeLookupResponse) => void;
  onAddManually: (gtin: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pauseDetectRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);

  const [manualCode, setManualCode] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });

  const lookupGtin = async (raw: string) => {
    const code = normalizeDetectedCode(raw);
    if (code.length < 8) {
      setLookup({
        status: "error",
        code: raw,
        message: "Слишком короткий код — нужны цифры EAN/UPC",
      });
      pauseDetectRef.current = false;
      return;
    }

    pauseDetectRef.current = true;
    lastCodeRef.current = code;
    setLookup({ status: "looking", code });

    try {
      const res = await fetch(
        `/api/appliances/icecat/barcode?gtin=${encodeURIComponent(code)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as BarcodeLookupResponse & {
        error?: string;
      };
      if (!res.ok) {
        const message = data.error || "Товар не найден";
        if (res.status === 404 || res.status === 403) {
          setLookup({ status: "missing", code, message });
        } else {
          setLookup({ status: "error", code, message });
          pauseDetectRef.current = false;
        }
        return;
      }
      setLookup({ status: "found", code, result: data });
    } catch (err) {
      setLookup({
        status: "error",
        code,
        message:
          err instanceof Error ? err.message : "Не удалось проверить код",
      });
      pauseDetectRef.current = false;
    }
  };

  const resumeScan = () => {
    pauseDetectRef.current = false;
    lastCodeRef.current = null;
    setLookup({ status: "idle" });
    setManualCode("");
  };

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let detector: BarcodeDetectorLike | null = null;
    let frame = 0;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      try {
        detector = await createBarcodeDetector();
      } catch {
        if (!cancelled) {
          setCameraError(
            "Не удалось загрузить сканер — введите код вручную ниже",
          );
        }
        return;
      }

      if (cancelled) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Камера недоступна в этом браузере — введите код вручную ниже",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setCameraReady(true);
      } catch {
        if (!cancelled) {
          setCameraError(
            "Нет доступа к камере — введите штрихкод вручную ниже",
          );
        }
        return;
      }

      const tick = async () => {
        if (cancelled || !detector) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2 || pauseDetectRef.current) {
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
          return;
        }

        frame += 1;
        if (frame % 3 !== 0) {
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
          return;
        }

        try {
          const codes = await detector.detect(video);
          const value = codes.find((item) => item.rawValue?.trim())?.rawValue;
          const code = value ? normalizeDetectedCode(value) : "";
          if (code.length >= 8 && code !== lastCodeRef.current) {
            setLookup({ status: "detected", code });
            await lookupGtin(code);
            raf = window.requestAnimationFrame(() => {
              void tick();
            });
            return;
          }
        } catch {
          // keep scanning
        }

        raf = window.requestAnimationFrame(() => {
          void tick();
        });
      };

      raf = window.requestAnimationFrame(() => {
        void tick();
      });
    };

    void start();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const looking =
    lookup.status === "looking" || lookup.status === "detected";
  const shownCode =
    lookup.status === "idle" ? null : "code" in lookup ? lookup.code : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-end bg-black/70 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6">
        <div className="mx-auto flex max-h-[92dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-[#111113] text-white shadow-2xl lg:max-w-md lg:rounded-[28px]">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <div className="w-10" />
            <h2 className="ty-heading text-white">Штрихкод</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="relative overflow-hidden rounded-[20px] bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                className={cn(
                  "aspect-[3/4] w-full object-cover",
                  !cameraReady && "opacity-0",
                )}
              />
              {!cameraReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 text-center">
                  <Camera className="h-8 w-8 text-zinc-400" />
                  <p className="ty-note text-zinc-300">
                    {cameraError ?? "Включаем камеру…"}
                  </p>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-[16px] border-2 border-white/70" />
              {shownCode ? (
                <div className="absolute inset-x-3 bottom-3 rounded-[14px] bg-black/75 px-3 py-2.5 backdrop-blur-sm">
                  <p className="ty-label text-zinc-400">Распознан код</p>
                  <p className="mt-0.5 font-mono text-[18px] tracking-wide text-white">
                    {shownCode}
                  </p>
                  <p className="mt-1 ty-note text-zinc-300">
                    {lookup.status === "detected" || lookup.status === "looking"
                      ? "Проверяем каталог…"
                      : lookup.status === "found"
                        ? `Найдено: ${lookup.result.product.brand} ${lookup.result.product.modelName}`
                        : lookup.status === "missing"
                          ? "В каталоге нет"
                          : lookup.status === "error"
                            ? lookup.message
                            : null}
                  </p>
                </div>
              ) : cameraReady ? (
                <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-[14px] bg-black/55 px-3 py-2 text-center ty-note text-zinc-200">
                  Наведите рамку на штрихкод
                </div>
              ) : null}
            </div>

            {lookup.status === "found" ? (
              <div className="space-y-3 rounded-[16px] border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="ty-label text-emerald-200">Товар найден</p>
                    <p className="mt-1 text-[15px] text-white">
                      {lookup.result.product.brand}{" "}
                      {lookup.result.product.modelName}
                    </p>
                    {lookup.result.categoryName ? (
                      <p className="mt-0.5 ty-note text-zinc-400">
                        {lookup.result.categoryName}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => onFound(lookup.result)}
                >
                  Использовать эту модель
                </Button>
                <button
                  type="button"
                  onClick={resumeScan}
                  className="w-full text-center ty-note text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  Сканировать другой код
                </button>
              </div>
            ) : null}

            {lookup.status === "missing" ? (
              <div className="space-y-3 rounded-[16px] border border-amber-400/30 bg-amber-500/10 px-3.5 py-3">
                <div>
                  <p className="ty-label text-amber-200">Товара нет в каталоге</p>
                  <p className="mt-1 ty-note text-zinc-300">{lookup.message}</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => onAddManually(lookup.code)}
                >
                  Добавить вручную
                </Button>
                <button
                  type="button"
                  onClick={resumeScan}
                  className="w-full text-center ty-note text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  Сканировать другой код
                </button>
              </div>
            ) : null}

            {lookup.status === "error" ? (
              <div className="space-y-2 rounded-[16px] border border-rose-400/30 bg-rose-500/10 px-3.5 py-3">
                <p className="ty-note text-rose-200">{lookup.message}</p>
                <button
                  type="button"
                  onClick={resumeScan}
                  className="ty-note text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  Попробовать снова
                </button>
              </div>
            ) : null}

            {looking ? (
              <div className="flex items-center justify-center gap-2 ty-note text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Ищем модель по штрихкоду…
              </div>
            ) : null}

            <div className="space-y-3 rounded-[16px] border border-white/10 bg-white/5 px-3.5 py-3">
              <p className="ty-label text-zinc-200">Как сканировать</p>
              <ul className="list-disc space-y-1.5 pl-4 ty-note text-zinc-400">
                <li>
                  Линейный код с полосками и цифрами (не QR) — чаще EAN-13, 13
                  цифр.
                </li>
                <li>
                  У товаров из РФ код часто начинается с{" "}
                  <span className="text-zinc-200">460–469</span>.
                </li>
                <li>Держите код в рамке ровно, без бликов — распознавание само.</li>
              </ul>
              <div className="rounded-[14px] bg-white px-3 py-3">
                <p className="mb-2 text-center ty-label text-zinc-500">
                  Пример EAN-13
                </p>
                <Ean13Example code={EXAMPLE_EAN13} />
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block ty-label text-zinc-400">
                Или введите код вручную
              </span>
              <input
                inputMode="numeric"
                value={manualCode}
                disabled={looking}
                onChange={(event) => {
                  setManualCode(
                    event.target.value.replace(/\D/g, "").slice(0, 14),
                  );
                }}
                placeholder={EXAMPLE_EAN13}
                className="h-12 w-full rounded-[16px] border border-white/10 bg-white/5 px-4 text-[16px] text-white outline-none placeholder:text-zinc-500 disabled:opacity-50"
              />
            </label>
          </div>

          <div className="shrink-0 space-y-2 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="w-full"
              disabled={looking || manualCode.replace(/\D/g, "").length < 8}
              onClick={() => void lookupGtin(manualCode)}
            >
              {looking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ищем…
                </>
              ) : (
                "Найти по коду"
              )}
            </Button>
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
