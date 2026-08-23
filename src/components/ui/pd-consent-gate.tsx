"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { PdConsentCheckbox } from "@/components/ui/pd-consent-checkbox";
import {
  acceptPdConsentForSession,
  fetchPdConsentStatus,
} from "@/lib/pd-consent-client";
import { canUseServerAuth } from "@/lib/client-auth";

export function PdConsentGate({ onAccepted }: { onAccepted: () => void }) {
  const [checking, setChecking] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPdConsentStatus().then((accepted) => {
      if (cancelled) return;
      if (accepted) {
        onAccepted();
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [onAccepted]);

  const submit = useCallback(async () => {
    if (!consent || !canUseServerAuth()) return;
    setBusy(true);
    setError(null);
    try {
      await acceptPdConsentForSession();
      onAccepted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить согласие",
      );
    } finally {
      setBusy(false);
    }
  }, [consent, onAccepted]);

  if (checking) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-xl">
        <BrandLogo className="mx-auto mb-4 h-9" />
        <h2 className="mb-2 text-center text-[20px] font-semibold text-zinc-900">
          Согласие на обработку данных
        </h2>
        <p className="mb-4 text-center text-[14px] leading-relaxed text-zinc-500">
          Чтобы сохранять щитки и заявки, нужно принять документы сервиса.
        </p>
        <PdConsentCheckbox checked={consent} onChange={setConsent} />
        {error && (
          <p className="mt-3 text-[13px] text-red-600">{error}</p>
        )}
        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={!consent || busy}
          onClick={() => void submit()}
        >
          {busy ? "Сохраняем…" : "Продолжить"}
        </Button>
      </div>
    </div>
  );
}
