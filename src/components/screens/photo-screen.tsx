"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { fileToCompressedDataUrl } from "@/lib/image";

const tips = [
  "Хорошее освещение",
  "Камера прямо перед щитком",
  "Все устройства в кадре",
];

export function PhotoScreen({
  onBack,
  onCapture,
}: {
  onBack: () => void;
  onCapture: (photoDataUrl: string) => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const openedOnce = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCamera = () => {
    setError(null);
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    setError(null);
    galleryInputRef.current?.click();
  };

  // After instruction screen mounts, open the camera once.
  useEffect(() => {
    if (openedOnce.current) return;
    openedOnce.current = true;
    const t = window.setTimeout(() => openCamera(), 450);
    return () => window.clearTimeout(t);
  }, []);

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      // Skip in-app confirmation — native camera already has Retake / Use Photo.
      onCapture(dataUrl);
    } catch {
      setError("Не удалось обработать фото. Попробуйте ещё раз.");
      setBusy(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
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
        <h1 className="text-[20px] font-semibold text-zinc-900">Новый щиток</h1>
      </header>

      <div className="mb-6">
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-zinc-900">
          Сфотографируйте электрощиток
        </h2>
        <p className="text-[15px] leading-relaxed text-zinc-500">
          Мы распознаем автоматы, УЗО, реле и шины, затем соберём интерактивную
          схему.
        </p>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <GlassCard className="relative mb-6 overflow-hidden p-0">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-200/80">
          <div className="absolute inset-4 rounded-[16px] border border-black/8 bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex h-full flex-col gap-2 rounded-[12px] border border-black/[0.06] bg-zinc-50 p-2">
              <div className="flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full min-h-[88px] flex-1 rounded-md border border-black/8 bg-gradient-to-b from-zinc-200 to-zinc-300/80"
                  >
                    <div className="mx-auto mt-2 h-2 w-2 rounded-full bg-red-400/80" />
                    <div className="mx-auto mt-3 h-8 w-[60%] rounded-sm bg-zinc-400/40" />
                  </div>
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <div className="h-6 flex-1 rounded bg-emerald-500/25" />
                <div className="h-6 flex-1 rounded bg-sky-500/25" />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(17,17,19,0.06))]" />
          {busy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-700" />
            </div>
          )}
        </div>
      </GlassCard>

      <ul className="mb-8 space-y-3">
        {tips.map((tip, i) => (
          <motion.li
            key={tip}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex items-center gap-3 text-[15px] text-zinc-700"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="h-4 w-4" />
            </span>
            {tip}
          </motion.li>
        ))}
      </ul>

      {error && (
        <p className="mb-4 text-center text-[14px] text-rose-600">{error}</p>
      )}

      <div className="mt-auto space-y-3">
        <Button
          className="w-full"
          size="lg"
          onClick={openCamera}
          disabled={busy}
        >
          <Camera className="h-5 w-5" />
          Сфотографировать щиток
        </Button>
        <button
          type="button"
          onClick={openGallery}
          disabled={busy}
          className="w-full text-center text-[15px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-800 disabled:opacity-40"
        >
          Загрузить фотографию
        </button>
      </div>
    </motion.section>
  );
}
