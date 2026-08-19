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

      // Check if any recent accepted request needs 5-min feedback
      for (const req of r) {
        if (
          req.masterAcceptedAt &&
          !req.dispatchedAt
        ) continue;
        if (!req.masterAcceptedAt) continue;
        const acceptedMs = new Date(req.masterAcceptedAt).getTime();
        const elapsed = Date.now() - acceptedMs;
        if (elapsed >= FEEDBACK_DELAY_MS && elapsed < FEEDBACK_DELAY_MS + 60_000) {
          setFeedbackRequestId(req.id);
          break;
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ratingDisplay =
    profile?.profile
      ? `${profile.profile.rating}%`
      : "—";
  const ordersDisplay = profile?.profile?.ordersCount ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-0 flex-1 flex-col pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-4 flex items-center justify-between px-5">
        <h1 className="text-[22px] font-bold text-zinc-900">Режим мастера</h1>
        <button
          type="button"
          onClick={onSwitchToUser}
          className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-600 shadow-sm"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Клиент
        </button>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 px-5">
        <GlassCard className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] text-zinc-500">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            Рейтинг
          </div>
          <div className="text-[24px] font-bold text-zinc-900">
            {loading ? "…" : ratingDisplay}
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] text-zinc-500">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
            Заказы
          </div>
          <div className="text-[24px] font-bold text-zinc-900">
            {loading ? "…" : ordersDisplay}
          </div>
        </GlassCard>
      </div>

      <div className="mb-3 px-5">
        <h2 className="text-[17px] font-semibold text-zinc-900">
          Заявки клиентов
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-zinc-100 text-zinc-400">
              <ClipboardList className="h-7 w-7" />
            </div>
            <p className="max-w-[260px] text-[15px] text-zinc-500">
              Пока нет принятых заявок. Они появятся, когда вы примете заявку в Telegram-боте.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <GlassCard key={req.id} className="flex items-center gap-2 p-2 pr-3">
                {req.panelId ? (
                  <button
                    type="button"
                    onClick={() => onOpenPanel(req)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-zinc-100 text-zinc-600"
                    aria-label="Открыть щиток клиента"
                  >
                    <BreakerIcon className="h-6 w-6" />
                  </button>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-zinc-100 text-zinc-500">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onOpenRequest(req)}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold text-zinc-900">
                      {req.publicCode ?? req.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        installStatusTone(req.status).badge,
                      )}
                    >
                      {req.statusLabel}
                    </span>
                  </div>
                  <p className="truncate text-[13px] text-zinc-500">
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
