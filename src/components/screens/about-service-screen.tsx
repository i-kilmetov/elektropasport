"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  HousePlug,
  ShieldCheck,
  Smartphone,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

type PublicStats = {
  usersCount: number;
  panelsCount: number;
  mastersCount: number;
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function LiveCount({ value }: { value: number | null | undefined }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (typeof value !== "number") {
      setShown(0);
      return;
    }
    const from = 0;
    const to = value;
    const duration = 900;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  if (value === undefined) {
    return <span className="text-zinc-300">— — —</span>;
  }
  if (value === null) {
    return <span className="text-zinc-400">—</span>;
  }
  return <>{formatCount(shown)}</>;
}

const pillars = [
  {
    id: "panel",
    icon: Zap,
    title: "Понятный щиток",
    lead: "Увидеть схему, риски и что делать — без электрического жаргона.",
    points: [
      {
        icon: ShieldCheck,
        title: "Безопасность на виду",
        text: "Понятно, есть ли УЗО, где перегруз и что обесточить в аварии.",
      },
      {
        icon: Zap,
        title: "Схема простым языком",
        text: "Автоматы и линии подписаны так, чтобы разобрался не только мастер.",
      },
      {
        icon: HousePlug,
        title: "Решение, а не догадка",
        text: "Сразу видно: оставить, усилить или звать специалиста.",
      },
    ],
  },
  {
    id: "appliances",
    icon: BookOpen,
    title: "Вся техника в одном месте",
    lead: "Крупная техника, нагрузка и инструкции — в одном списке у щитка.",
    points: [
      {
        icon: BookOpen,
        title: "Все руководства рядом",
        text: "Инструкции и руководства к технике больше не по шкафам: всё собрано в Токоме.",
      },
      {
        icon: HousePlug,
        title: "Нагрузка без сюрпризов",
        text: "Духовка, стиральная и кондиционер видны вместе со щитком — проще не перегрузить линию.",
      },
      {
        icon: Smartphone,
        title: "Модель и мощность под рукой",
        text: "Перед покупкой новой техники сразу видно, потянет ли сеть.",
      },
    ],
  },
  {
    id: "help",
    icon: Wrench,
    title: "Электрическая помощь",
    lead: "Онлайн или на дом — без пересказа ситуации с нуля.",
    points: [
      {
        icon: Smartphone,
        title: "Онлайн — чтобы понять",
        text: "Консультация по щитку и технике, когда нужно быстро решить, что делать.",
      },
      {
        icon: Wrench,
        title: "На дом — руки специалиста",
        text: "Выезд, если нужна скорая помощь: искра, выбивает автомат, непонятный ввод.",
      },
      {
        icon: ShieldCheck,
        title: "История уже с вами",
        text: "Мастеру не надо собирать картину заново: щиток и техника уже в заявке.",
      },
    ],
  },
] as const;

export function AboutServiceScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(pillars[0].id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("stats failed");
        const data = (await res.json()) as PublicStats;
        if (!cancelled) {
          setStats({
            usersCount: Number(data.usersCount) || 0,
            panelsCount: Number(data.panelsCount) || 0,
            mastersCount: Number(data.mastersCount) || 0,
          });
          setStatsError(false);
        }
      } catch {
        if (!cancelled) setStatsError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    {
      key: "users",
      label: "человек уже пользуются",
      value: statsError ? null : stats === null ? undefined : stats.usersCount,
      icon: Users,
    },
    {
      key: "panels",
      label: "щитков оцифровано",
      value: statsError ? null : stats === null ? undefined : stats.panelsCount,
      icon: HousePlug,
    },
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-5 flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-zinc-900">О сервисе</h1>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
        <div>
          <BrandLogo className="h-9" />
          <p className="mt-4 text-[16px] leading-relaxed text-zinc-700">
            Собирает электрику дома в одном месте: щиток, технику и помощь
            специалистов — чтобы всё было понятно и безопасно.
          </p>
        </div>

        <div className="space-y-3">
          {pillars.map((pillar) => {
            const open = openId === pillar.id;
            return (
              <GlassCard key={pillar.id} className="overflow-hidden bg-white p-0">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : pillar.id)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                  aria-expanded={open}
                >
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-black/8 bg-white text-[#111113]">
                    <pillar.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-semibold text-zinc-900">
                      {pillar.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">
                      {pillar.lead}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 text-zinc-400 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-black/[0.06] px-4 pb-4 pt-3">
                        {pillar.points.map((point) => (
                          <div
                            key={point.title}
                            className="flex gap-3 rounded-[16px] border border-black/[0.06] bg-white p-3"
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#D3DA00] text-[#111113]">
                              <point.icon className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="text-[14px] font-semibold text-zinc-900">
                                {point.title}
                              </div>
                              <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">
                                {point.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-[16px] font-semibold text-zinc-900">
              Открытые данные
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-zinc-500">
              Считаем и показываем, сколько людей уже пользуются Током и сколько
              щитков оцифровано:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => (
              <GlassCard key={card.key} className="relative bg-white p-4">
                <span className="absolute right-3 top-3 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D3DA00] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D3DA00]" />
                </span>
                <card.icon className="mb-3 h-5 w-5 text-zinc-400" />
                <div className="font-mono text-[30px] font-semibold leading-none tracking-tight text-[#111113] tabular-nums">
                  <LiveCount value={card.value} />
                </div>
                <div className="mt-2 text-[12px] leading-snug text-zinc-500">
                  {card.label}
                </div>
              </GlassCard>
            ))}
          </div>

          {statsError && (
            <p className="text-[12px] text-zinc-400">
              Сейчас не удалось загрузить статистику. Попробуйте открыть раздел
              позже.
            </p>
          )}
        </div>
      </div>

      <Button className="mt-auto w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
