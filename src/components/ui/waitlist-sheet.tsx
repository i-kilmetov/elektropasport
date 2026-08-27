"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cable, Check, GraduationCap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import { hapticNotification } from "@/lib/haptics";
import {
  getUserProfile,
  persistUserProfile,
  saveUserProfile,
} from "@/lib/user-profile";

export type WaitlistKind = "school" | "terminals";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const WAITLIST_SUB_KEY = "elektropasport:waitlist-subscribed";

function readLocalSubscriptions(): Partial<Record<WaitlistKind, string>> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(
      localStorage.getItem(WAITLIST_SUB_KEY) ?? "{}",
    ) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const next: Partial<Record<WaitlistKind, string>> = {};
    for (const key of ["school", "terminals"] as const) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "string" && isValidEmail(value)) {
        next[key] = value.trim().toLowerCase();
      }
    }
    return next;
  } catch {
    return {};
  }
}

function markLocalSubscription(kind: WaitlistKind, email: string): void {
  try {
    localStorage.setItem(
      WAITLIST_SUB_KEY,
      JSON.stringify({ ...readLocalSubscriptions(), [kind]: email }),
    );
  } catch {
    // private mode
  }
}

const COPY: Record<
  WaitlistKind,
  { title: string; body: string[]; emailHint: string }
> = {
  school: {
    title: "Школа Током",
    body: [
      "Скоро запустим курсы по электрике для любого уровня — от новичка до уверенного любителя.",
      "Наша миссия — понятно и доступно объяснить, как всё устроено: щиток, защита, линии и безопасность дома.",
      "Оставьте почту — сообщим о старте школы и иногда пришлём самое интересное про электрику и сервис, не чаще одного раза в месяц.",
    ],
    emailHint: "Куда прислать новости о школе",
  },
  terminals: {
    title: "Клеммы и кабели",
    body: [
      "Сейчас эта функция доступна только мастерам сервиса Током.",
      "Мы сообщим, как только сделаем её доступной каждому пользователю.",
    ],
    emailHint: "Email для уведомления",
  },
};

export function WaitlistSheet({
  kind,
  onClose,
}: {
  kind: WaitlistKind;
  onClose: () => void;
}) {
  const copy = COPY[kind];
  const initialEmail = useMemo(
    () =>
      readLocalSubscriptions()[kind] || getUserProfile().email?.trim() || "",
    [kind],
  );
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(
    () => Boolean(readLocalSubscriptions()[kind]),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const local = readLocalSubscriptions()[kind];
    const profileEmail = getUserProfile().email?.trim() ?? "";
    setEmail(local || profileEmail);
    setSubscribed(Boolean(local));
    setError(null);

    if (!canUseServerAuth()) return;
    let cancelled = false;
    void fetch(`/api/waitlist?list=${kind}`, {
      headers: authHeaders(),
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as {
          subscribed?: boolean;
          email?: string | null;
        };
      })
      .then((data) => {
        if (cancelled || !data?.subscribed) return;
        const nextEmail = data.email?.trim().toLowerCase();
        if (nextEmail && isValidEmail(nextEmail)) {
          setEmail(nextEmail);
          markLocalSubscription(kind, nextEmail);
        }
        setSubscribed(true);
      })
      .catch(() => {
        // local flag is enough
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const submit = async () => {
    const next = email.trim().toLowerCase();
    if (!isValidEmail(next)) {
      setError("Введите корректный email");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (canUseServerAuth()) {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ list: kind, email: next }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || `Ошибка ${res.status}`);
        }
        await persistUserProfile({ ...getUserProfile(), email: next });
      } else {
        saveUserProfile({ email: next });
        // Still try anonymous waitlist if server is up without auth
        try {
          await fetch("/api/waitlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ list: kind, email: next }),
          });
        } catch {
          // local email is enough for prefills
        }
      }
      hapticNotification("success");
      markLocalSubscription(kind, next);
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подписаться");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#D3DA00]/35 text-zinc-900">
                {kind === "school" ? (
                  <GraduationCap className="h-5 w-5" />
                ) : (
                  <Cable className="h-5 w-5" />
                )}
              </span>
              <h2 className="text-[18px] font-semibold text-zinc-900">
                {copy.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-600"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {kind === "school" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/empty-states/school.png"
              alt="Класс Школы Током"
              width={921}
              height={1006}
              draggable={false}
              className="pointer-events-none mx-auto mb-4 h-[min(28dvh,180px)] w-auto max-w-full select-none object-contain"
            />
          ) : null}

          <div className="space-y-3">
            {copy.body.map((paragraph) => (
              <p
                key={paragraph}
                className="text-[15px] leading-relaxed text-zinc-600"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {subscribed ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-[16px] bg-zinc-100 px-3.5 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D3DA00] text-[#111113]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <p className="text-[14px] leading-snug text-zinc-700">
                Вы подписались
                {email.trim() ? (
                  <>
                    {" "}
                    — напишем на{" "}
                    <span className="font-medium text-zinc-900">
                      {email.trim()}
                    </span>
                  </>
                ) : null}
                .
              </p>
            </div>
          ) : (
            <>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-[13px] text-zinc-500">
                  {copy.emailHint}
                </span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                />
              </label>

              {error && (
                <p className="mt-2 text-[13px] text-rose-600">{error}</p>
              )}

              <Button
                className="mt-5 w-full"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "Отправляем…" : "Подписаться"}
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </Portal>
  );
}
