"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ImagePlus, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticNotification } from "@/lib/haptics";
import { fileToCompressedDataUrl } from "@/lib/image";
import { persistFeedback } from "@/lib/user-data";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_PHOTOS = 2;

const topics = [
  { id: "bugs" as const, label: "Ошибки" },
  { id: "tips" as const, label: "Рекомендации" },
  { id: "other" as const, label: "Другое" },
];

type FeedbackTopic = (typeof topics)[number]["id"];

export function FeedbackScreen({ onBack }: { onBack: () => void }) {
  const [topic, setTopic] = useState<FeedbackTopic | null>(null);
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const trimmed = message.trim();
  const canSubmit = Boolean(topic) && trimmed.length > 0 && !submitting && !photoBusy;

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    setPhotoBusy(true);
    setError(null);
    try {
      const next: string[] = [];
      for (const file of files.slice(0, remaining)) {
        next.push(await fileToCompressedDataUrl(file));
      }
      setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    } catch {
      setError("Не удалось добавить фото. Попробуйте другое изображение.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || !topic) return;
    setSubmitting(true);
    setError(null);
    try {
      await persistFeedback({
        message: trimmed,
        topic,
        photos,
      });
      hapticNotification("success");
      setSent(true);
    } catch (err) {
      hapticNotification("error");
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось отправить сообщение. Попробуйте ещё раз.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <motion.section
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-[24px] font-bold text-zinc-900">
            Спасибо за отзыв
          </h1>
          <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-zinc-500">
            Сообщение отправлено. Мы читаем каждую обратную связь и учитываем её
            в развитии сервиса.
          </p>
          <Button className="w-full" size="lg" onClick={onBack}>
            На главную
          </Button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
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
        <h1 className="text-[20px] font-semibold text-zinc-900">
          Обратная связь
        </h1>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-zinc-100 text-zinc-600">
          <MessageCircle className="h-8 w-8" />
        </div>

        <div>
          <h2 className="mb-3 text-[26px] font-bold tracking-tight text-zinc-900">
            Помогите сделать сервис лучше
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-500">
            Электропаспорт только развивается — будем рады любой обратной связи:
            баги, советы и поддержка. Напишите, что заметили или что хотели бы
            улучшить.
          </p>
        </div>

        <div>
          <div className="mb-2 text-[13px] font-medium text-zinc-600">Тема</div>
          <div className="grid grid-cols-3 gap-2">
            {topics.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTopic(item.id)}
                className={cn(
                  "rounded-[16px] border px-2 py-3 text-[13px] font-semibold transition-colors",
                  topic === item.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-black/8 bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <GlassCard className="p-4">
          <label className="mb-2 block text-[13px] font-medium text-zinc-600">
            Ваше сообщение
          </label>
          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
            }
            rows={5}
            placeholder="Расскажите о баге, идее или просто напишите нам"
            className="w-full resize-none rounded-[16px] border border-black/8 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
          />
          <div className="mt-2 text-right text-[12px] text-zinc-400">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[13px] font-medium text-zinc-600">
              Фотографии
            </div>
            <div className="text-[12px] text-zinc-400">
              {photos.length}/{MAX_PHOTOS}
            </div>
          </div>
          <p className="mb-3 text-[13px] leading-relaxed text-zinc-500">
            Можно приложить до двух скриншотов или фото.
          </p>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void addPhotos(e)}
          />

          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <div
                key={`${photo.slice(0, 48)}-${index}`}
                className="relative aspect-square overflow-hidden rounded-[16px] border border-black/8 bg-zinc-100"
              >
                <img
                  src={photo}
                  alt={`Фото ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Удалить фото"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => photoInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-black/15 bg-zinc-50 text-zinc-500 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-[13px] font-medium">
                  {photoBusy ? "Загрузка…" : "Добавить"}
                </span>
              </button>
            )}
          </div>
        </GlassCard>

        {error && (
          <p className="text-[13px] leading-relaxed text-rose-600">{error}</p>
        )}
      </div>

      <div className="mt-auto pt-2">
        <Button
          className="w-full"
          size="lg"
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          {submitting ? "Отправляем…" : "Отправить"}
        </Button>
      </div>
    </motion.section>
  );
}
