"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check, Loader2, Send } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const openedOnce = useRef(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCamera = () => {
    setError(null);
    inputRef.current?.click();
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
      setPreview(dataUrl);
    } catch {
      setError("Не удалось обработать фото. Попробуйте ещё раз.");
    } finally {
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Новый щиток</h1>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {!preview ? (
        <>
          <div className="mb-6">
            <h2 className="mb-2 text-[28px] font-bold tracking-tight text-white">
              Сфотографируйте электрощиток
            </h2>
            <p className="text-[15px] leading-relaxed text-white/50">
              Сделайте снимок так, чтобы были видны все автоматы, УЗО и шины.
            </p>
          </div>

          <GlassCard className="relative mb-6 overflow-hidden p-0">
            <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0d0d12]">
              <div className="absolute inset-4 rounded-[16px] border border-dashed border-white/15 bg-[#0a0a0e]/80" />
              {busy ? (
                <Loader2 className="relative z-10 h-8 w-8 animate-spin text-white" />
              ) : (
                <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
                  <Camera className="h-10 w-10 text-white/35" />
                  <p className="text-[14px] text-white/45">
                    Откроется камера телефона
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          <ul className="mb-6 space-y-3">
            {tips.map((tip, i) => (
              <motion.li
                key={tip}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex items-center gap-3 text-[15px] text-white/75"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <Check className="h-4 w-4" />
                </span>
                {tip}
              </motion.li>
            ))}
          </ul>

          {error && (
            <p className="mb-4 text-center text-[14px] text-rose-300">{error}</p>
          )}

          <div className="mt-auto">
            <Button
              className="w-full"
              size="lg"
              onClick={openCamera}
              disabled={busy}
            >
              <Camera className="h-5 w-5" />
              Открыть камеру
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="mb-2 text-[28px] font-bold tracking-tight text-white">
              Всё ок?
            </h2>
            <p className="text-[15px] leading-relaxed text-white/50">
              Проверьте фото: щиток в кадре, маркировка читается. Если нет —
              переснимите.
            </p>
          </div>

          <GlassCard className="relative mb-6 overflow-hidden p-0">
            <div className="relative aspect-[4/3] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Фото щитка"
                className="h-full w-full object-cover"
              />
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
          </GlassCard>

          {error && (
            <p className="mb-4 text-center text-[14px] text-rose-300">{error}</p>
          )}

          <div className="mt-auto space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => onCapture(preview)}
              disabled={busy}
            >
              <Send className="h-5 w-5" />
              Отправить
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={openCamera}
              disabled={busy}
            >
              <Camera className="h-5 w-5" />
              Переснять
            </Button>
          </div>
        </>
      )}
    </motion.section>
  );
}
