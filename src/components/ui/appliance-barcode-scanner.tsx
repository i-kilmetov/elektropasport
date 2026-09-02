"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import type { BarcodeLookupResponse } from "@/lib/appliance-barcode";
import { cn } from "@/lib/utils";

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector():
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

export function ApplianceBarcodeScanner({
  onClose,
  onFound,
}: {
  onClose: () => void;
  onFound: (result: BarcodeLookupResponse) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [hint, setHint] = useState("Наведите камеру на штрихкод");

  const lookupGtin = async (raw: string) => {
    if (lookingUp || scanningRef.current) return;
    scanningRef.current = true;
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
      scanningRef.current = false;
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let detector: BarcodeDetectorLike | null = null;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      const Detector = getBarcodeDetector();
      if (!Detector) {
        setCameraError(
          "Сканер камеры недоступен в этом браузере — введите код вручную",
        );
        setHint("Введите EAN с упаковки");
        return;
      }

      try {
        detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });
      } catch {
        detector = new Detector();
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
        setCameraReady(true);
        setHint("Наведите камеру на штрихкод");
      } catch {
        setCameraError(
          "Нет доступа к камере — введите штрихкод вручную",
        );
        setHint("Введите EAN с упаковки");
        return;
      }

      const tick = async () => {
        if (cancelled || scanningRef.current || !detector) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
          return;
        }
        try {
          const codes = await detector.detect(video);
          const value = codes.find((item) => item.rawValue?.trim())?.rawValue;
          if (value) {
            setHint("Ищем модель…");
            await lookupGtin(value);
            if (!cancelled && scanningRef.current === false) {
              setHint("Наведите камеру на штрихкод");
              raf = window.requestAnimationFrame(() => {
                void tick();
              });
            }
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
                    {cameraError ?? "Открываем камеру…"}
                  </p>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-[16px] border-2 border-white/70" />
            </div>

            <p className="text-center ty-note text-zinc-300">{hint}</p>

            <label className="block">
              <span className="mb-1.5 block ty-label text-zinc-400">
                Или введите код вручную
              </span>
              <input
                inputMode="numeric"
                value={manualCode}
                onChange={(event) => {
                  setManualCode(event.target.value.replace(/\D/g, "").slice(0, 14));
                  setLookupError(null);
                }}
                placeholder="4601234567890"
                className="h-12 w-full rounded-[16px] border border-white/10 bg-white/5 px-4 text-[16px] text-white outline-none placeholder:text-zinc-500"
              />
            </label>

            {lookupError ? (
              <p className="ty-note text-rose-300">{lookupError}</p>
            ) : null}
          </div>

          <div className="shrink-0 space-y-2 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="w-full"
              disabled={lookingUp || manualCode.replace(/\D/g, "").length < 8}
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
            <Button className="w-full" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
