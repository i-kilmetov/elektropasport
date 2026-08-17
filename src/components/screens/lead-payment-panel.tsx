"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRub } from "@/lib/lead-services";
import {
  createSbpPayment,
  fetchSbpPayment,
  openSbpPayload,
  type SbpPaymentClient,
} from "@/lib/user-data";
import type { PendingInstallLead } from "@/lib/pending-lead";
import { cn } from "@/lib/utils";

function QrFrame({ image, payload }: { image: string | null; payload: string | null }) {
  if (image) {
    const svg = image.trim().startsWith("<");
    if (svg) {
      return (
        <div
          className="mx-auto w-[220px] overflow-hidden rounded-[20px] bg-white p-3"
          dangerouslySetInnerHTML={{ __html: image }}
        />
      );
    }
    const src = image.startsWith("data:")
      ? image
      : `data:image/svg+xml;base64,${image}`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="QR СБП"
        className="mx-auto h-[220px] w-[220px] rounded-[20px] bg-white p-3"
      />
    );
  }
  if (payload) {
    return (
      <p className="break-all rounded-[16px] bg-zinc-50 px-3 py-2 text-center text-[12px] text-zinc-500">
        {payload}
      </p>
    );
  }
  return null;
}

export function LeadPaymentPanel({
  lead,
  amountRub,
  serviceTitle,
  onPaid,
  onBack,
  onCreated,
}: {
  lead: PendingInstallLead;
  amountRub: number;
  serviceTitle: string;
  onPaid: (payment: SbpPaymentClient) => void;
  onBack: () => void;
  onCreated?: (payment: SbpPaymentClient) => void;
}) {
  const [payment, setPayment] = useState<SbpPaymentClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const paidRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void createSbpPayment(lead)
      .then((created) => {
        if (!cancelled) {
          setPayment(created);
          onCreated?.(created);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Не удалось создать платёж",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Create once per lead id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const timer = window.setInterval(() => {
      void fetchSbpPayment(payment.id)
        .then((next) => {
          setPayment(next);
          if (next.status === "confirmed" && !paidRef.current) {
            paidRef.current = true;
            onPaidRef.current(next);
          }
          if (next.status === "failed") {
            setError("Оплата не прошла. Попробуйте ещё раз.");
          }
        })
        .catch((err: unknown) => {
          console.error(err);
        });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 rounded-[20px] border border-black/8 bg-zinc-50 p-4 text-center">
        <p className="text-[13px] text-zinc-500">{serviceTitle}</p>
        <p className="mt-1 text-[28px] font-bold tabular-nums text-zinc-900">
          {formatRub(amountRub)}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
          Оплата по СБП на счёт самозанятого в Т‑Банке. Отсканируйте QR или
          откройте приложение банка.
        </p>
      </div>

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-[14px]">Готовим счёт…</p>
        </div>
      )}

      {error && !loading && (
        <p className="mb-4 text-center text-[14px] leading-relaxed text-rose-600">
          {error}
        </p>
      )}

      {payment && payment.status !== "failed" && (
        <div className="flex flex-col items-center">
          <QrFrame image={payment.qrImage} payload={payment.qrPayload} />
          <p
            className={cn(
              "mt-4 text-[14px]",
              payment.status === "confirmed"
                ? "text-emerald-600"
                : "text-zinc-500",
            )}
          >
            {payment.status === "confirmed"
              ? "Оплата получена"
              : "Ждём оплату…"}
          </p>
        </div>
      )}

      <div className="mt-auto space-y-2 pt-6">
        {payment?.qrPayload && payment.status === "pending" && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => openSbpPayload(payment.qrPayload!)}
          >
            Оплатить в приложении банка
          </Button>
        )}
        <Button className="w-full" variant="secondary" onClick={onBack}>
          Назад
        </Button>
      </div>
    </div>
  );
}
