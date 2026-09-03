"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  ClipboardList,
  Loader2,
  Store,
  Star,
  Zap,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { MasterFeedbackDialog } from "@/components/ui/master-feedback-dialog";
import {
  acceptMasterExchangeRequest,
  fetchMasterExchangeRequests,
  fetchMasterProfile,
  fetchMasterRequests,
  type MasterProfileData,
} from "@/lib/user-data";
import type { InstallRequest } from "@/types";
import { installStatusTone } from "@/types";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 5 * 60 * 1000;

const darkCard = "border-white/10 bg-white/[0.06] shadow-none";

function formatPaidAgo(paidAt?: string): string | null {
  if (!paidAt) return null;
  const ms = Date.now() - new Date(paidAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "только что оплачено";
  if (mins < 60) return `оплачено ${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const rem = mins % 60;
    return rem > 0
      ? `оплачено ${hours} ч ${rem} мин назад`
      : `оплачено ${hours} ч назад`;
  }
  const days = Math.floor(hours / 24);
  return `оплачено ${days} дн назад`;
}

export function MasterDashboardScreen({
  onSwitchToUser,
  onOpenRequest,
  onOpenPanel,
}: {
  onSwitchToUser: () => void;
  onOpenRequest: (request: InstallRequest) => void;
  onOpenPanel: (request: InstallRequest) => void;
}) {
  const [tab, setTab] = useState<"mine" | "exchange">("mine");
  const [profile, setProfile] = useState<MasterProfileData | null>(null);
  const [requests, setRequests] = useState<InstallRequest[]>([]);
  const [exchange, setExchange] = useState<InstallRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [feedbackRequestId, setFeedbackRequestId] = useState<string | null>(
    null,
  );

  const reloadMine = useCallback(async () => {
    const [p, r] = await Promise.all([
      fetchMasterProfile(),
      fetchMasterRequests(),
    ]);
    setProfile(p);
    setRequests(r);
    for (const req of r) {
      if (!req.masterAcceptedAt) continue;
      const acceptedMs = new Date(req.masterAcceptedAt).getTime();
      const elapsed = Date.now() - acceptedMs;
      if (elapsed >= FEEDBACK_DELAY_MS && elapsed < FEEDBACK_DELAY_MS + 60_000) {
        setFeedbackRequestId(req.id);
        break;
      }
    }
  }, []);

  const reloadExchange = useCallback(async () => {
    setExchangeLoading(true);
    setExchangeError(null);
    try {
      const items = await fetchMasterExchangeRequests();
      setExchange(items);
    } catch (error) {
      setExchangeError(
        error instanceof Error ? error.message : "Не удалось загрузить биржу",
      );
    } finally {
      setExchangeLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await reloadMine();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadMine]);

  useEffect(() => {
    if (tab !== "exchange") return;
    void reloadExchange();
  }, [tab, reloadExchange]);

  const ratingDisplay = profile?.profile
    ? `${profile.profile.rating}%`
    : "—";
  const ordersDisplay = profile?.profile?.ordersCount ?? 0;
  const cityLabel = profile?.profile?.city?.trim() || null;

  const handleAccept = async (request: InstallRequest) => {
    setAcceptingId(request.id);
    setExchangeError(null);
    try {
      const accepted = await acceptMasterExchangeRequest(request.id);
      setExchange((prev) => prev.filter((item) => item.id !== request.id));
      setRequests((prev) => [accepted, ...prev.filter((item) => item.id !== accepted.id)]);
      setTab("mine");
      onOpenRequest(accepted);
    } catch (error) {
      setExchangeError(
        error instanceof Error ? error.message : "Не удалось принять заявку",
      );
      void reloadExchange();
    } finally {
      setAcceptingId(null);
    }
  };

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
            {cityLabel
              ? `Город: ${cityLabel}`
              : "Сейчас включён кабинет мастера"}
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
        <div className="flex rounded-full bg-white/8 p-1">
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={cn(
              "flex-1 rounded-full px-3 py-2 ty-label transition-colors",
              tab === "mine" ? "bg-white text-zinc-900" : "text-white/60",
            )}
          >
            Мои заявки
          </button>
          <button
            type="button"
            onClick={() => setTab("exchange")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 ty-label transition-colors",
              tab === "exchange" ? "bg-white text-zinc-900" : "text-white/60",
            )}
          >
            <Store className="h-3.5 w-3.5" />
            Биржа заявок
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[max(5rem,calc(4rem+env(safe-area-inset-bottom)))]">
        {tab === "mine" ? (
          loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/8 text-white/40">
                <ClipboardList className="h-7 w-7" />
              </div>
              <p className="max-w-[260px] text-[15px] text-white/50">
                Пока нет принятых заявок. Откройте «Биржа заявок», чтобы взять
                заказ в своём городе.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const paidAgo =
                  req.status === "in_progress"
                    ? formatPaidAgo(req.paidAt)
                    : null;
                return (
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
                      {paidAgo ? (
                        <p
                          className={cn(
                            "mt-1 ty-badge",
                            Date.now() - new Date(req.paidAt ?? 0).getTime() >
                              2 * 60 * 60 * 1000
                              ? "text-rose-300"
                              : "text-amber-300",
                          )}
                        >
                          {paidAgo}
                        </p>
                      ) : req.status === "payment" ? (
                        <p className="mt-1 ty-badge text-amber-300">
                          Ожидает оплаты заказчиком
                        </p>
                      ) : null}
                    </button>
                  </GlassCard>
                );
              })}
            </div>
          )
        ) : exchangeLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-3">
            {exchangeError ? (
              <p className="rounded-[16px] border border-rose-400/30 bg-rose-500/10 px-3 py-2 ty-note text-rose-200">
                {exchangeError}
              </p>
            ) : null}
            {!cityLabel ? (
              <p className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 ty-note text-white/60">
                Укажите город в заявке «Стать мастером», чтобы видеть биржу по
                своему городу.
              </p>
            ) : exchange.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/8 text-white/40">
                  <Store className="h-7 w-7" />
                </div>
                <p className="max-w-[260px] text-[15px] text-white/50">
                  В городе «{cityLabel}» пока нет новых заявок.
                </p>
              </div>
            ) : (
              exchange.map((req) => (
                <GlassCard key={req.id} className={cn("space-y-3 p-4", darkCard)}>
                  <div>
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="truncate ty-heading text-white">
                        {req.publicCode ?? req.title}
                      </span>
                      <span className="shrink-0 rounded-full bg-rose-500/20 px-2 py-0.5 ty-badge text-rose-200">
                        Новая
                      </span>
                    </div>
                    <p className="ty-note text-white/50">
                      {req.exactAddress ?? req.city}
                    </p>
                    <p className="mt-1 truncate ty-meta text-white/40">
                      {req.subtitle}
                    </p>
                  </div>
                  <Button
                    className="w-full bg-[#D3DA00] text-zinc-900 hover:bg-[#c4cb00]"
                    disabled={acceptingId === req.id}
                    onClick={() => void handleAccept(req)}
                  >
                    {acceptingId === req.id ? "Принимаем…" : "Принять заявку"}
                  </Button>
                </GlassCard>
              ))
            )}
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
