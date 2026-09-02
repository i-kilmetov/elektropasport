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
          setCameraError("Сканер недоступен — введите код вручную");
        }
        return;
      }

      if (cancelled) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Камера недоступна — введите код вручную");
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
          setCameraError("Нет доступа к камере — введите код вручную");
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
  const hasResult =
    lookup.status === "found" ||
    lookup.status === "missing" ||
    lookup.status === "error";

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 backdrop-blur-sm lg:items-center lg:p-6">
        <div className="flex h-[min(100dvh,720px)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white text-zinc-900 shadow-2xl lg:h-auto lg:max-h-[min(92dvh,680px)] lg:rounded-[28px]">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4">
            <div className="w-9" />
            <h2 className="ty-heading text-zinc-950">Штрихкод</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
            <div className="relative h-[144px] shrink-0 overflow-hidden rounded-[16px] bg-zinc-900 sm:h-[160px]">
              <video
                ref={videoRef}
                muted
                playsInline
                className={cn(
                  "h-full w-full object-cover",
                  !cameraReady && "opacity-0",
                )}
              />
              {!cameraReady ? (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-zinc-100 px-4 text-center">
                  <Camera className="h-4 w-4 shrink-0 text-zinc-500" />
                  <p className="ty-note text-zinc-600">
                    {cameraError ?? "Включаем камеру…"}
                  </p>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-y-3 inset-x-8 rounded-[12px] border-2 border-white/80" />
            </div>

            <div className="shrink-0 rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2">
              {shownCode ? (
                <>
                  <p className="ty-label text-zinc-500">Код</p>
                  <p className="font-mono text-[17px] tracking-wide text-zinc-950">
                    {shownCode}
                  </p>
                  <p className="mt-0.5 ty-note text-zinc-600">
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
                </>
              ) : (
                <p className="ty-note text-zinc-600">
                  {cameraReady
                    ? "Наведите камеру на штрихкод EAN-13"
                    : "Нужен доступ к камере для сканирования"}
                </p>
              )}
            </div>

            {lookup.status === "found" ? (
              <div className="shrink-0 space-y-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="ty-label text-emerald-800">Товар найден</p>
                    <p className="truncate text-[14px] text-zinc-900">
                      {lookup.result.product.brand}{" "}
                      {lookup.result.product.modelName}
                    </p>
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
                  className="w-full text-center ty-note text-zinc-500"
                >
                  Сканировать другой
                </button>
              </div>
            ) : null}

            {lookup.status === "missing" ? (
              <div className="shrink-0 space-y-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="ty-label text-amber-900">Товара нет в каталоге</p>
                <p className="ty-note text-zinc-600">{lookup.message}</p>
                <Button
                  className="w-full"
                  onClick={() => onAddManually(lookup.code)}
                >
                  Выбрать из каталога
                </Button>
                <button
                  type="button"
                  onClick={resumeScan}
                  className="w-full text-center ty-note text-zinc-500"
                >
                  Сканировать другой
                </button>
              </div>
            ) : null}

            {lookup.status === "error" ? (
              <div className="shrink-0 space-y-1.5 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="ty-note text-rose-700">{lookup.message}</p>
                <button
                  type="button"
                  onClick={resumeScan}
                  className="ty-note text-zinc-500"
                >
                  Попробовать снова
                </button>
              </div>
            ) : null}

            {looking ? (
              <div className="flex shrink-0 items-center justify-center gap-2 ty-note text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Ищем модель…
              </div>
            ) : null}

            {!hasResult && !looking ? (
              <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
                <p className="ty-note text-zinc-600">
                  Нужен линейный штрихкод EAN-13 (13 цифр под полосками), не
                  QR-код. В РФ часто начинается с 460–469.
                </p>
                <div className="rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2.5">
                  <p className="mb-1.5 text-center ty-label text-zinc-500">
                    Пример EAN-13
                  </p>
                  <Ean13Example code={EXAMPLE_EAN13} compact />
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1" />
            )}

            <label className="block shrink-0">
              <span className="mb-1 block ty-label text-zinc-500">
                Или введите EAN-13 вручную
              </span>
              <div className="flex gap-2">
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
                  className="h-11 min-w-0 flex-1 rounded-[14px] border border-black/8 bg-zinc-50 px-3 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50"
                />
                <Button
                  className="h-11 shrink-0 px-3"
                  disabled={looking || manualCode.replace(/\D/g, "").length < 8}
                  onClick={() => void lookupGtin(manualCode)}
                >
                  {looking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Найти"
                  )}
                </Button>
              </div>
            </label>
          </div>

          <div className="shrink-0 border-t border-black/6 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
