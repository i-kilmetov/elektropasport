"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { hapticNotification } from "@/lib/haptics";
import { persistFeedback } from "@/lib/user-data";

const MAX_MESSAGE_LENGTH = 2000;

export function FeedbackScreen({ onBack }: { onBack: () => void }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await persistFeedback(trimmed);
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

      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--accent)]/15 text-[var(--accent)]">
        <MessageCircle className="h-8 w-8" />
      </div>

      <h2 className="mb-3 text-[26px] font-bold tracking-tight text-zinc-900">
        Помогите сделать сервис лучше
      </h2>
      <p className="mb-5 text-[15px] leading-relaxed text-zinc-500">
        Электропаспорт только развивается — будем рады любой обратной связи:
        баги, советы и поддержка. Напишите, что заметили или что хотели бы
        улучшить.
      </p>

      <GlassCard className="mb-4 p-4">
        <label className="mb-2 block text-[13px] font-medium text-zinc-600">
          Ваше сообщение
        </label>
        <textarea
          value={message}
          onChange={(e) =>
            setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
          }
          rows={6}
          placeholder="Расскажите о баге, идее или просто напишите нам"
          className="w-full resize-none rounded-[16px] border border-black/8 bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
        />
        <div className="mt-2 text-right text-[12px] text-zinc-400">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </div>
      </GlassCard>

      {error && (
        <p className="mb-3 text-[13px] leading-relaxed text-rose-600">{error}</p>
      )}

      <div className="mt-auto">
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
