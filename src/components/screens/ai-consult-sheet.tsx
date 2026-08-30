"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import type { ParsedAiLead } from "@/lib/ai-lead-ready";
import type { AiChatMessage } from "@/lib/yandex-ai-studio";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function nextMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const AI_CONSULT_WELCOME =
  "Привет! Я Ток Токич — ИИ-помощник в сервисе Током. Что у вас случилось с электрикой, чем помочь?";

export function AiConsultSheet({
  city,
  onClose,
  onLeadReady,
}: {
  city: string;
  onClose: () => void;
  onLeadReady: (lead: ParsedAiLead) => void | Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiHistory, setApiHistory] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const leadLockRef = useRef(false);

  useEffect(() => {
    setApiHistory([]);
    setMessages([
      {
        id: nextMessageId(),
        role: "assistant",
        content: AI_CONSULT_WELCOME,
      },
    ]);
  }, [city]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || loading) return;

    if (!canUseServerAuth()) {
      setError("Войдите через Telegram, чтобы пользоваться консультантом");
      return;
    }

    setError(null);
    setDraft("");
    setLoading(true);

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/ai/consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          message: text,
          history: apiHistory,
          city,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        reply?: string;
        leadReady?: ParsedAiLead | null;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось получить ответ");
      }

      const reply = data.reply?.trim();
      if (reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: "assistant",
            content: reply,
          },
        ]);
        setApiHistory((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: reply },
        ]);
      }

      if (data.leadReady && !leadLockRef.current) {
        leadLockRef.current = true;
        setLeadSubmitted(true);
        await onLeadReady(data.leadReady);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId(),
            role: "assistant",
            content:
              "Заявка оформлена — с вами свяжутся по указанным контактам. Если появятся новые вопросы, напишите здесь.",
          },
        ]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить сообщение",
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg)]"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-black/8 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100">
            <Sparkles className="h-5 w-5 text-zinc-800" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="ty-title">ИИ-консультация</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-[20px] px-4 py-3 ty-body whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-zinc-900 text-white"
                    : "border border-black/8 bg-white text-zinc-900",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {loading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-[20px] border border-black/8 bg-white px-4 py-3 ty-body text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Думаю…
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/8 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {error ? (
            <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          ) : null}
          {leadSubmitted ? (
            <p className="mb-2 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
              Контакты приняты — заявка передана оператору.
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              rows={1}
              placeholder="Опишите проблему…"
              disabled={loading}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 ty-body outline-none focus:border-zinc-400 disabled:opacity-60"
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              disabled={loading || !draft.trim()}
              onClick={() => void sendMessage()}
              aria-label="Отправить"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Portal>
  );
}
