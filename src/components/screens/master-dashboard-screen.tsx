"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  ClipboardList,
  Loader2,
  Star,
  Zap,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { GlassCard } from "@/components/ui/glass-card";
import { MasterFeedbackDialog } from "@/components/ui/master-feedback-dialog";
import {
  fetchMasterProfile,
  fetchMasterRequests,
  type MasterProfileData,
} from "@/lib/user-data";
import type { InstallRequest } from "@/types";
import { installStatusTone } from "@/types";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 5 * 60 * 1000;

const darkCard =
  "border-white/10 bg-white/[0.06] shadow-none";

export function MasterDashboardScreen({
  onSwitchToUser,
  onOpenRequest,
  onOpenPanel,
}: {
  onSwitchToUser: () => void;
  onOpenRequest: (request: InstallRequest) => void;
  onOpenPanel: (request: InstallRequest) => void;
}) {
  const [profile, setProfile] = useState<MasterProfileData | null>(null);
  const [requests, setRequests] = useState<InstallRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [p, r] = await Promise.all([
        fetchMasterProfile(),
        fetchMasterRequests(),
      ]);
      if (cancelled) return;
      setProfile(p);
      setRequests(r);
      setLoading(false);

      for (const req of r) {
        if (req.masterAcceptedAt && !req.dispatchedAt) continue;
        if (!req.masterAcceptedAt) continue;
        const acceptedMs = new Date(req.masterAcceptedAt).getTime();
        const elapsed = Date.now() - acceptedMs;
        if (elapsed >= FEEDBACK_DELAY_MS && elapsed < FEEDBACK_DELAY_MS + 60_000) {
          setFeedbackRequestId(req.id);
          break;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ratingDisplay = profile?.profile
    ? `${profile.profile.rating}%`
    : "—";
  const ordersDisplay = profile?.profile?.ordersCount ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col bg-[#111113] pt-[max(1.25rem,env(safe-area-inset-top))] text-white"
    >
      <header className="mb-4 flex items-center justify-between gap-3 px-5">
        <div className="min-w-0">
          <h1 className="ty-title text-white">Режим мастера</h1>
          <p className="mt-0.5 text-[13px] text-[#D3DA00]">
            Сейчас включён кабинет мастера
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToUser}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 ty-label text-white"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Пользователь
        </button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 px-5">
        <GlassCard className={cn("p-4", darkCard)}>
          <div className="mb-1 flex items-center gap-1.5 text-[12px] text-white/50">
            <Star className="h-3.5 w-3.5 text-amber-300" />
            Рейтинг
          </div>
          <div className="ty-display text-white">
            {loading ? "…" : ratingDisplay}
          </div>
        </GlassCard>
        <GlassCard className={cn("p-4", darkCard)}>
          <div className="mb-1 flex items-center gap-1.5 text-[12px] text-white/50">
            <Zap className="h-3.5 w-3.5 text-[#D3DA00]" />
            Заказы
          </div>
          <div className="ty-display text-white">
            {loading ? "…" : ordersDisplay}
          </div>
        </GlassCard>
      </div>

      <div className="mb-3 px-5">
        <h2 className="ty-heading text-white">
          Заявки клиентов
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/8 text-white/40">
              <ClipboardList className="h-7 w-7" />
            </div>
            <p className="max-w-[260px] text-[15px] text-white/50">
              Пока нет принятых заявок. Они появятся, когда вы примете заявку в
              Telegram-боте.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <GlassCard
                key={req.id}
                className={cn("flex items-center gap-2 p-2 pr-3", darkCard)}
              >
                {req.panelId ? (
                  <button
                    type="button"
                    onClick={() => onOpenPanel(req)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-white"
                    aria-label="Открыть щиток клиента"
                  >
                    <BreakerIcon className="h-6 w-6" />
                  </button>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 text-white/60">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onOpenRequest(req)}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <span className="truncate ty-heading text-white">
                      {req.publicCode ?? req.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 ty-badge",
                        installStatusTone(req.status).badge,
                      )}
                    >
                      {req.statusLabel}
                    </span>
                  </div>
                  <p className="truncate ty-note text-white/50">
                    {req.exactAddress ?? req.city ?? "—"}
                  </p>
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {feedbackRequestId && (
          <MasterFeedbackDialog
            requestId={feedbackRequestId}
            role="master"
            onClose={() => setFeedbackRequestId(null)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
