"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  HousePlug,
  LayoutGrid,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { BrandLogo, BRAND_YELLOW } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

type PublicStats = {
  usersCount: number;
  panelsCount: number;
  mastersCount: number;
};

function formatCount(value: number | null | undefined): string {
  if (value === undefined) return "…";
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU").format(value);
}

const pillars = [
  {
    id: "panel",
    icon: Zap,
    title: "Разобраться со щитком",
    lead: "Понять, что происходит в электрическом сердце дома — и что с этим делать.",
    body: [
      "Щиток решает, будет ли дома безопасно: от него зависят перегрузки, УЗО и то, как быстро можно обесточить линию. Пока схема «в голове у электрика», вы не видите риски и не понимаете, что именно сломалось.",
      "Током помогает сфотографировать щиток, разобрать автоматы простым языком и увидеть состояние защиты. Так проще принять решение: что можно оставить, что усилить и когда звать мастера — не наугад, а по делу.",
    ],
  },
  {
    id: "appliances",
    icon: LayoutGrid,
    title: "Вся техника дома в одном месте",
    lead: "Собрать крупную технику рядом со щитком, чтобы видеть реальную нагрузку.",
    body: [
      "Духовка, стиральная, кондиционер и бойлер живут в разных комнатах, а питаются из одного щитка. Если не держать их вместе, легко перегрузить линию или купить технику, которую сеть просто не выдержит.",
      "В Токоме техника привязывается к дому и щитку: мощность, модель и где она стоит. Это помогает планировать новые приборы, понимать запас по нагрузке и не собирать электрику заново после каждого ремонта.",
    ],
  },
  {
    id: "help",
    icon: Wrench,
    title: "Помощь по электрике — быстро и рядом",
    lead: "Обратиться за любой помощью: онлайн или со специалистом на дом.",
    body: [
      "Электрика ломается в неудачный момент: выбило автомат, искрит розетка, неясно, можно ли подключать духовку. Искать «просто мастера» долго, а объяснять ситуацию с нуля ещё дольше.",
      "Через Током можно оставить заявку на консультацию или выезд, не собирая историю заново: щиток и техника уже под рукой. Онлайн — чтобы быстро понять, что делать. На дом — если нужна скорая помощь и руки специалиста.",
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
      label: "человек уже в Токоме",
      value: statsError ? null : stats === null ? undefined : stats.usersCount,
      icon: Users,
      tone: "mustard" as const,
    },
    {
      key: "panels",
      label: "щитков добавлено",
      value: statsError ? null : stats === null ? undefined : stats.panelsCount,
      icon: HousePlug,
      tone: "ink" as const,
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

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <GlassCard className="overflow-hidden p-0">
          <div className="px-5 py-6 text-[#111113]" style={{ backgroundColor: BRAND_YELLOW }}>
            <BrandLogo className="mb-4 h-9" />
            <h2 className="text-[24px] font-bold tracking-tight">
              Три опоры Токома
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[#111113]/80">
              Сервис держит электрику дома в одном месте: щиток, технику и
              помощь специалиста — чтобы решения были понятными, а не наугад.
            </p>
          </div>
        </GlassCard>

        <div className="space-y-3">
          {pillars.map((pillar, i) => {
            const open = openId === pillar.id;
            return (
              <GlassCard key={pillar.id} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : pillar.id)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                  aria-expanded={open}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
                      i === 1
                        ? "bg-[#111113] text-white"
                        : "bg-[#D3DA00] text-[#111113]",
                    )}
                  >
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
                      <div className="space-y-3 border-t border-black/[0.06] px-4 pb-4 pt-3">
                        {pillar.body.map((paragraph) => (
                          <p
                            key={paragraph.slice(0, 24)}
                            className="text-[13px] leading-relaxed text-zinc-600"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>

        <GlassCard className="space-y-4 p-4">
          <div>
            <h3 className="text-[16px] font-semibold text-zinc-900">
              Открытые цифры
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Сколько людей уже пользуются Токомом и сколько щитков добавлено —
              без прикрас, как есть.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card, i) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 + i * 0.05 }}
                className={cn(
                  "rounded-[18px] border border-black/[0.06] p-4",
                  card.tone === "mustard"
                    ? "bg-[#D3DA00]"
                    : "bg-[#111113] text-white",
                )}
              >
                <card.icon
                  className={cn(
                    "mb-3 h-5 w-5",
                    card.tone === "mustard" ? "text-[#111113]" : "text-[#D3DA00]",
                  )}
                />
                <div
                  className={cn(
                    "text-[32px] font-bold leading-none tracking-tight tabular-nums",
                    card.tone === "mustard" ? "text-[#111113]" : "text-white",
                  )}
                >
                  {formatCount(card.value)}
                </div>
                <div
                  className={cn(
                    "mt-2 text-[12px] leading-snug",
                    card.tone === "mustard" ? "text-[#111113]/70" : "text-white/70",
                  )}
                >
                  {card.label}
                </div>
              </motion.div>
            ))}
          </div>

          {statsError && (
            <p className="text-[12px] text-zinc-400">
              Сейчас не удалось загрузить статистику. Попробуйте открыть раздел
              позже.
            </p>
          )}
        </GlassCard>
      </div>

      <Button className="mt-auto w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
