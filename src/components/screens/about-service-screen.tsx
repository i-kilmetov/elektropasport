"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Flame,
  Shield,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/icons/brand-mark";
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

const missionPoints = [
  {
    icon: Shield,
    title: "Безопасность людей",
    text: "Понимание щитка помогает вовремя заметить перегруз, отсутствие УЗО и другие риски.",
    accent: "text-sky-600 bg-sky-500/10",
  },
  {
    icon: Flame,
    title: "Пожаробезопасность",
    text: "Большинство бытовых пожаров начинается с электрики. Разобраться в щитке — значит снизить опасность.",
    accent: "text-orange-600 bg-orange-500/10",
  },
  {
    icon: Zap,
    title: "Спокойствие дома",
    text: "Когда вы знаете, что за что отвечает, проще общаться с мастером и принимать решения.",
    accent: "text-emerald-600 bg-emerald-500/10",
  },
] as const;

export function AboutServiceScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsError, setStatsError] = useState(false);

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
      label: "пользователей в сервисе",
      value: statsError ? null : stats === null ? undefined : stats.usersCount,
      icon: Users,
      tint: "from-sky-500/12 to-sky-500/4",
    },
    {
      key: "panels",
      label: "щитков добавлено",
      value: statsError ? null : stats === null ? undefined : stats.panelsCount,
      icon: Zap,
      tint: "from-amber-500/12 to-amber-500/4",
    },
    {
      key: "masters",
      label: "мастеров подали заявку",
      value: statsError ? null : stats === null ? undefined : stats.mastersCount,
      icon: Wrench,
      tint: "from-emerald-500/12 to-emerald-500/4",
    },
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center gap-3">
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

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <GlassCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 px-5 py-6 text-white">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/10">
              <BrandMark className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-[24px] font-bold tracking-tight">
              Главная миссия — чтобы вы разбирались в своём щитке
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-300">
              Электропаспорт помогает увидеть схему, состав устройств и уровень
              безопасности простым языком. Это напрямую влияет на вашу
              безопасность и пожаробезопасность дома.
            </p>
          </div>
        </GlassCard>

        <div className="space-y-3">
          {missionPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
            >
              <GlassCard className="flex gap-3 p-4">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
                    point.accent,
                  )}
                >
                  <point.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-zinc-900">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                    {point.text}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <GlassCard className="space-y-4 border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-500/15 text-emerald-700">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-900">
                Открытая статистика сервиса
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                Мы публикуем живые цифры без прикрас: сколько людей пользуется
                сервисом, сколько щитков добавлено и сколько мастеров подало
                заявку на подключение. Так видно, что происходит прямо сейчас.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {statCards.map((card, i) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={cn(
                  "rounded-[18px] border border-black/[0.06] bg-gradient-to-br p-4",
                  card.tint,
                )}
              >
                <card.icon className="mb-3 h-5 w-5 text-zinc-600" />
                <div className="text-[36px] font-bold leading-none tracking-tight tabular-nums text-zinc-900">
                  {formatCount(card.value)}
                </div>
                <div className="mt-2 text-[12px] leading-snug text-zinc-600">
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

        <GlassCard className="space-y-3 p-4">
          <h3 className="text-[16px] font-semibold text-zinc-900">
            Как это работает
          </h3>
          <ul className="space-y-2.5 text-[14px] leading-relaxed text-zinc-500">
            <li className="flex gap-2">
              <span className="font-semibold text-zinc-700">1.</span>
              <span>
                Сфотографируйте щиток — сервис соберёт схему и карточку объекта.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-zinc-700">2.</span>
              <span>
                Укажите параметры сети и получите оценку безопасности.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-zinc-700">3.</span>
              <span>
                Если щитка нет или нужна помощь — оставьте заявку и свяжитесь с
                мастером.
              </span>
            </li>
          </ul>
        </GlassCard>

        <GlassCard className="space-y-2 p-4">
          <h3 className="text-[16px] font-semibold text-zinc-900">Важно знать</h3>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Электропаспорт не заменяет проектную документацию и очный осмотр
            электрика. Сервис помогает разобраться в ситуации и быстрее
            связаться со специалистом, но работы с напряжением должен выполнять
            квалифицированный мастер.
          </p>
        </GlassCard>
      </div>

      <Button className="mt-auto w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
