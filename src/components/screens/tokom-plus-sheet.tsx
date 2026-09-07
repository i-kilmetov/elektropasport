"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Infinity, X, Zap } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { authHeaders, canUseServerAuth } from "@/lib/client-auth";
import { hapticNotification } from "@/lib/haptics";
import {
  formatRub,
} from "@/lib/lead-services";
import {
  formatPlusUntil,
  TOKOM_PLUS_COMPARISON,
  TOKOM_PLUS_PRICE_RUB,
  TOKOM_PLUS_TAGLINE,
} from "@/lib/tokom-plus";
import { openSbpPayload } from "@/lib/user-data";
import { cn } from "@/lib/utils";

export type TokomPlusUpsellReason =
  | "profile"
  | "panels"
  | "appliances"
  | "terminals";

const REASON_INTRO: Record<TokomPlusUpsellReason, string> = {
  profile: "Заряженная подписка снимает лимиты и открывает расключение проводами.",
  panels: "Лимит щитков без подписки — 5. Током Плюс снимает ограничение.",
  appliances:
    "Без подписки к щитку можно добавить до 10 видов техники. Плюс снимает лимит.",
  terminals:
    "Режим «Клеммы» и расключение проводами доступны с заряженной подпиской Током Плюс.",
};

type PlusStatus = {
  active: boolean;
  until: string | null;
  untilLabel: string;
  priceRub: number;
};

export function TokomPlusSheet({
  open,
  reason = "profile",
  onClose,
  onActivated,
}: {
  open: boolean;
  reason?: TokomPlusUpsellReason;
  onClose: () => void;
  onActivated?: () => void;
}) {
  const [status, setStatus] = useState<PlusStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !canUseServerAuth()) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/payments/plus", {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data = (await res.json()) as PlusStatus;
        if (!cancelled) setStatus(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !paymentId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/payments/plus", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ paymentId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as PlusStatus & { status?: string };
        if (cancelled) return;
        if (data.active || data.status === "confirmed") {
          setStatus({
            active: true,
            until: data.until,
            untilLabel: data.untilLabel || formatPlusUntil(data.until),
            priceRub: data.priceRub ?? TOKOM_PLUS_PRICE_RUB,
          });
          setPaymentId(null);
          hapticNotification("success");
          onActivated?.();
        }
      } catch {
        // ignore
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, paymentId, onActivated]);

  const startPay = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/plus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: "{}",
      });
      const data = (await res.json()) as {
        error?: string;
        id?: string;
        qrPayload?: string | null;
        status?: string;
        active?: boolean;
        until?: string | null;
      };
      if (!res.ok) {
        throw new Error(data.error || "Не удалось создать оплату");
      }
      if (data.active) {
        setStatus({
          active: true,
          until: data.until ?? null,
          untilLabel: formatPlusUntil(data.until),
          priceRub: TOKOM_PLUS_PRICE_RUB,
        });
        onActivated?.();
        return;
      }
      if (data.id) setPaymentId(data.id);
      if (data.qrPayload) {
        openSbpPayload(data.qrPayload);
      } else {
        throw new Error("Нет ссылки на оплату");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка оплаты");
    } finally {
      setBusy(false);
    }
  };

  const active = Boolean(status?.active);
  const price = status?.priceRub ?? TOKOM_PLUS_PRICE_RUB;

  return (
    <AnimatePresence>
      {open ? (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 48 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 lg:max-w-md lg:rounded-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <BrandLogo plus className="h-8" />
                  <p className="mt-2 ty-meta font-medium uppercase tracking-[0.06em] text-zinc-500">
                    {TOKOM_PLUS_TAGLINE}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-5 ty-body text-zinc-700">
                {REASON_INTRO[reason]}
              </p>

              {active ? (
                <div className="mb-5 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2 ty-heading text-emerald-900">
                    <Check className="h-4 w-4" />
                    Подписка активна
                  </div>
                  {status?.untilLabel ? (
                    <p className="mt-1 ty-note text-emerald-800">
                      До {status.untilLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mb-5 overflow-hidden rounded-[20px] border border-black/8">
                <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr] bg-zinc-50 px-3 py-2 ty-meta font-medium text-zinc-500">
                  <span />
                  <span className="text-center">Без Плюс</span>
                  <span className="text-center text-zinc-900">Плюс</span>
                </div>
                {TOKOM_PLUS_COMPARISON.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1.2fr_0.9fr_0.9fr] border-t border-black/6 px-3 py-2.5"
                  >
                    <span className="ty-note text-zinc-800">{row.label}</span>
                    <span className="text-center ty-note text-zinc-500">
                      {row.free}
                    </span>
                    <span className="text-center ty-note font-medium text-zinc-900">
                      {row.plus}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-start gap-2 ty-note text-zinc-600">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                  <span>
                    Оценка безопасности на этапе «Расключение» считается только
                    после работ мастера Током — своё расключение на оценку не
                    влияет.
                  </span>
                </div>
                <div className="flex items-start gap-2 ty-note text-zinc-600">
                  <Infinity className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                  <span>
                    Если мастер уже расключил щиток, изменить расключение
                    нельзя — сохраняется вариант мастера.
                  </span>
                </div>
              </div>

              {error ? (
                <p className="mb-3 ty-note text-red-600">{error}</p>
              ) : null}

              {!active ? (
                <>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={busy}
                    onClick={() => void startPay()}
                  >
                    {busy
                      ? "Открываем оплату…"
                      : `Подключить · ${formatRub(price)} / мес.`}
                  </Button>
                  <p className="mt-3 text-center ty-meta text-zinc-500">
                    Оплата через Robokassa. Оформляя подписку, вы принимаете{" "}
                    <a
                      href="/legal/plus"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      условия Током Плюс
                    </a>
                    .
                  </p>
                </>
              ) : (
                <Button className="w-full" size="lg" onClick={onClose}>
                  Готово
                </Button>
              )}
            </motion.div>
          </motion.div>
        </Portal>
      ) : null}
    </AnimatePresence>
  );
}

export function TokomPlusProfileCard({
  active,
  untilLabel,
  onOpen,
}: {
  active: boolean;
  untilLabel?: string | null;
  onOpen: () => void;
}) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <div
        className={cn(
          "flex gap-3 rounded-[24px] border p-4 transition active:scale-[0.99]",
          active
            ? "border-emerald-200 bg-emerald-50/80"
            : "border-black/8 bg-white shadow-[0_12px_32px_rgba(17,17,19,0.06)]",
        )}
      >
        <BrandLogo plus className="h-9 shrink-0 self-center" />
        <div className="min-w-0 flex-1">
          <div className="ty-heading text-zinc-900">Током Плюс</div>
          <p className="mt-1 ty-meta font-medium uppercase tracking-[0.05em] text-zinc-500">
            {TOKOM_PLUS_TAGLINE}
          </p>
          <p className="mt-1 ty-note text-zinc-600">
            {active
              ? untilLabel
                ? `Активна до ${untilLabel}`
                : "Подписка активна"
              : `Безлимит, клеммы и −5% на вызов мастера · ${formatRub(TOKOM_PLUS_PRICE_RUB)}/мес.`}
          </p>
        </div>
      </div>
    </button>
  );
}
