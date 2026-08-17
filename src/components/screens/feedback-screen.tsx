"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  FileIcon,
  MessageCircle,
  Paperclip,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticNotification } from "@/lib/haptics";
import { fileToCompressedDataUrl } from "@/lib/image";
import { persistFeedback } from "@/lib/user-data";

const MAX_MESSAGE_LENGTH = 2000;

const topics = [
  { id: "bugs" as const, label: "Ошибки" },
  { id: "tips" as const, label: "Рекомендации" },
  { id: "other" as const, label: "Другое" },
];

type FeedbackTopic = (typeof topics)[number]["id"];

type Attachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

async function prepareAttachment(file: File): Promise<Attachment> {
  const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
  if (file.type.startsWith("image/")) {
    const dataUrl = await fileToCompressedDataUrl(file);
    const blob = await (await fetch(dataUrl)).blob();
    const compressed = new File(
      [blob],
      file.name.replace(/\.\w+$/, ".jpg") || "photo.jpg",
      { type: "image/jpeg" },
    );
    return { id, file: compressed, previewUrl: dataUrl };
  }
  return { id, file };
}

export function FeedbackScreen({ onBack }: { onBack: () => void }) {
  const [topic, setTopic] = useState<FeedbackTopic | null>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attachBusy, setAttachBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmed = message.trim();
  const canSubmit =
    Boolean(topic) && trimmed.length > 0 && !submitting && !attachBusy;

  const attachmentPreviews = useMemo(() => attachments, [attachments]);

  const addFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;

    setAttachBusy(true);
    setError(null);
    try {
      const next: Attachment[] = [];
      for (const file of files) {
        next.push(await prepareAttachment(file));
      }
      setAttachments((prev) => [...prev, ...next]);
    } catch {
      setError("Не удалось прикрепить файл. Попробуйте ещё раз.");
    } finally {
      setAttachBusy(false);
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
        files: attachments.map((item) => item.file),
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
            Токщиток только развивается — будем рады любой обратной связи:
            баги, советы и поддержка. Напишите, что заметили или что хотели бы
            улучшить.
          </p>
        </div>

        <div>
          <div className="mb-2 text-[13px] font-medium text-zinc-600">Тема</div>
          <div className="relative">
            <select
              value={topic ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "bugs" || value === "tips" || value === "other") {
                  setTopic(value);
                }
              }}
              className="h-14 w-full appearance-none rounded-[20px] border border-black/8 bg-zinc-50 px-4 pr-11 text-[16px] text-zinc-900 outline-none focus:border-zinc-300"
            >
              <option value="" disabled>
                Выберите тему
              </option>
              {topics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
              ▾
            </span>
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
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void addFiles(e)}
              />
              <button
                type="button"
                disabled={attachBusy}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40"
                aria-label="Прикрепить файл"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              {attachBusy && (
                <span className="text-[12px] text-zinc-400">Добавляем…</span>
              )}
            </div>
            <div className="text-[12px] text-zinc-400">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>

          {attachmentPreviews.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachmentPreviews.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-[14px] border border-black/8 bg-zinc-50 px-3 py-2"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-[10px] object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-zinc-200 text-zinc-600">
                      <FileIcon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">
                    {item.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) =>
                        prev.filter((entry) => entry.id !== item.id),
                      )
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                    aria-label="Убрать файл"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
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
