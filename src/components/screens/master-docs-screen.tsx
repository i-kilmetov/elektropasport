"use client";

import { useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import {
  MASTER_YELLOW_BTN,
  MasterApplyFrame,
} from "@/components/master-apply/master-apply-frame";
import { Button } from "@/components/ui/button";
import { hapticImpact, hapticNotification } from "@/lib/haptics";
import { fileToCompressedDataUrl } from "@/lib/image";

const MAX_DOCS = 3;
const GALLERY_ACCEPT =
  "image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.webp";

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

export function MasterDocsScreen({
  onBack,
  onConfirm,
  initialPhotos = [],
}: {
  onBack: () => void;
  onConfirm: (photos: string[]) => void;
  initialPhotos?: string[];
}) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFile = async (file: File | null) => {
    if (!file) return;
    if (photos.length >= MAX_DOCS) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, {
        maxSide: 960,
        quality: 0.72,
      });
      hapticImpact("light");
      setPhotos((prev) => [...prev, dataUrl].slice(0, MAX_DOCS));
    } catch {
      hapticNotification("error");
      setError("Не получилось обработать фото. Попробуйте другое.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MasterApplyFrame
      onBack={onBack}
      title="Документы"
      footer={
        <>
          {error ? (
            <p className="text-center text-[13px] text-rose-300">{error}</p>
          ) : null}
          <Button
            className={`w-full ${MASTER_YELLOW_BTN}`}
            size="lg"
            disabled={photos.length === 0 || busy}
            onClick={() => onConfirm(photos)}
          >
            Продолжить
          </Button>
        </>
      }
    >
      <h2 className="mb-2 text-[26px] font-bold tracking-tight text-white">
        Образование в электрике
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-white/55">
        Приложите фото диплома, свидетельства или удостоверения — так мы
        подтверждаем квалификацию. Нужен хотя бы один снимок, максимум три.
      </p>

      {photos.length > 0 ? (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {photos.map((src, index) => (
            <div
              key={`${index}-${src.slice(-12)}`}
              className="relative aspect-[3/4] overflow-hidden rounded-[16px] border border-white/10 bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Документ ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label="Удалить фото"
                onClick={() => {
                  hapticImpact("light");
                  setPhotos((prev) => prev.filter((_, i) => i !== index));
                }}
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {photos.length < MAX_DOCS ? (
        <div className="space-y-2">
          <Button
            className={`w-full ${MASTER_YELLOW_BTN}`}
            disabled={busy}
            onClick={() => void pickImageFile({ accept: GALLERY_ACCEPT, capture: true }).then(addFile)}
          >
            <Camera className="h-5 w-5" />
            {busy ? "Обрабатываем…" : "Сфотографировать"}
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void pickImageFile({ accept: GALLERY_ACCEPT }).then(addFile)
            }
            className="flex w-full items-center justify-center gap-2 py-2 text-center text-[15px] font-medium text-white/45 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/70 disabled:opacity-40"
          >
            <ImagePlus className="h-4 w-4" />
            Загрузить из галереи
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-white/40">
          Добавлено максимум фото. Лишнее можно удалить и заменить.
        </p>
      )}
    </MasterApplyFrame>
  );
}
