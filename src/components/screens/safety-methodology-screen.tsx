"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowLeft,
  Cable,
  Eye,
  Flame,
  Gauge,
  PlugZap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AxisMeter({
  label,
  hint,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  hint: string;
  value: number;
  tone: "emerald" | "amber" | "sky";
  icon: typeof Shield;
}) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const timer = window.setTimeout(() => setWidth(value), 120);
    return () => window.clearTimeout(timer);
  }, [inView, value]);

  const fill =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-sky-500";
  const chip =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "bg-amber-50 text-amber-900"
        : "bg-sky-50 text-sky-900";

  return (
    <div ref={ref} className="rounded-[22px] border border-black/[0.06] bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-[14px]", chip)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="ty-heading text-zinc-900">{label}</p>
          <p className="ty-meta text-zinc-500">{hint}</p>
        </div>
        <span className="ml-auto ty-heading tabular-nums text-zinc-900">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", fill)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function StageVisual({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-zinc-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-48 w-full object-cover object-center sm:h-56"
      />
      <figcaption className="border-t border-black/[0.06] px-4 py-3 ty-meta text-zinc-500">
        {caption}
      </figcaption>
    </figure>
  );
}

function WiringDiagram() {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-[#111113] p-4 text-white">
      <p className="mb-4 ty-label text-white/55">Схема расключения</p>
      <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden>
        <rect x="18" y="28" width="54" height="36" rx="8" fill="#2A2A2E" stroke="#D3DA00" strokeWidth="1.5" />
        <rect x="18" y="96" width="54" height="36" rx="8" fill="#2A2A2E" stroke="#7DD3FC" strokeWidth="1.5" />
        <rect x="248" y="28" width="54" height="36" rx="8" fill="#2A2A2E" stroke="#FBBF24" strokeWidth="1.5" />
        <rect x="248" y="96" width="54" height="36" rx="8" fill="#2A2A2E" stroke="#34D399" strokeWidth="1.5" />
        <text x="45" y="50" textAnchor="middle" fill="#F4F4F5" fontSize="10">Ввод</text>
        <text x="45" y="118" textAnchor="middle" fill="#F4F4F5" fontSize="10">УЗО</text>
        <text x="275" y="50" textAnchor="middle" fill="#F4F4F5" fontSize="10">Авт.</text>
        <text x="275" y="118" textAnchor="middle" fill="#F4F4F5" fontSize="10">Диф</text>
        <path d="M72 46 H160 V46 H248" stroke="#D3DA00" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M72 114 H120 V46" stroke="#7DD3FC" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M160 46 V114 H248" stroke="#FBBF24" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 114 H248" stroke="#34D399" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="160" cy="46" r="4" fill="#D3DA00" />
        <circle cx="120" cy="114" r="4" fill="#7DD3FC" />
      </svg>
      <p className="mt-3 ty-meta text-white/45">
        Цвет и сечение кабеля, нули и земля — всё влияет на итоговую оценку
      </p>
    </div>
  );
}

export function SafetyMethodologyScreen({ onBack }: { onBack: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F7F5]"
    >
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-zinc-900 shadow-sm"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="ty-title">Как мы считаем</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto max-w-xl px-5">
          <Reveal>
            <div className="relative overflow-hidden rounded-[28px] border border-black/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/onboarding/safety.jpg"
                alt="Безопасность электрощитка"
                className="h-[240px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="ty-note text-white/70">Безопасность щитка</p>
                <h2 className="mt-1 ty-display text-white">
                  Не «на глаз», а по данным
                </h2>
                <p className="mt-2 max-w-[34ch] ty-body text-white/80">
                  Знакомый электрик может дать мнение за минуту. Мы собираем
                  факты о приборах, нагрузках и расключении — и только потом
                  ставим оценку.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-8" delay={0.05}>
            <p className="ty-label text-zinc-500">Три измерения риска</p>
            <h3 className="mt-1 ty-heading text-zinc-900">
              Безопасность — это не одно число из воздуха
            </h3>
            <p className="mt-2 ty-body text-zinc-600">
              Оценка складывается из трёх независимых параметров. Каждый
              отвечает за свой тип опасности: удар током, пожар и порчу техники.
            </p>
          </Reveal>

          <div className="mt-4 space-y-3">
            <Reveal delay={0.08}>
              <AxisMeter
                icon={UserRound}
                label="Безопасность человека"
                hint="Защита от поражения током"
                value={78}
                tone="emerald"
              />
            </Reveal>
            <Reveal delay={0.12}>
              <AxisMeter
                icon={Flame}
                label="Пожаробезопасность"
                hint="Нагрев, дуга, перегруз кабеля"
                value={64}
                tone="amber"
              />
            </Reveal>
            <Reveal delay={0.16}>
              <AxisMeter
                icon={PlugZap}
                label="Безопасность техники"
                hint="Скачки, просадки, качество сети"
                value={71}
                tone="sky"
              />
            </Reveal>
          </div>

          <Reveal className="mt-8" delay={0.05}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-rose-200/70 bg-rose-50/60 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-rose-600">
                  <Eye className="h-5 w-5" />
                </div>
                <p className="ty-heading text-zinc-900">«На глаз» у знакомого</p>
                <p className="mt-2 ty-body text-zinc-600">
                  Пришёл в гости, глянул на щиток: «нормально / страшно / надо
                  менять». Без моделей приборов, без реальных нагрузок, без
                  проверки кабелей и клемм.
                </p>
              </div>
              <div className="rounded-[24px] border border-emerald-200/70 bg-emerald-50/70 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="ty-heading text-zinc-900">Оценка в Током</p>
                <p className="mt-2 ty-body text-zinc-600">
                  Считаем по приборам и их характеристикам, по вашим нагрузкам и
                  по фактическому расключению. Результат можно перепроверить и
                  улучшить по шагам.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-10">
            <p className="ty-label text-zinc-500">Три этапа</p>
            <h3 className="mt-1 ty-heading text-zinc-900">
              Чем глубже данные — тем точнее вердикт
            </h3>
          </Reveal>

          <Reveal className="mt-5 space-y-4" delay={0.06}>
            <div className="rounded-[28px] border border-black/[0.06] bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D3DA00] ty-heading text-[#111113]">
                  1
                </span>
                <div>
                  <p className="ty-heading text-zinc-900">Визуально по приборам</p>
                  <p className="ty-meta text-zinc-500">Базовая оценка щитка</p>
                </div>
              </div>
              <StageVisual
                src="/school/panel-anatomy.png"
                alt="Устройство щитка"
                caption="Типы приборов, номиналы и компоновка — только первый слой"
              />
              <p className="mt-4 ty-body text-zinc-600">
                Так любят «оценивать» щиток те, кто считает себя разбирающимся:
                открыл дверцу, увидел набор автоматов — и уже готов вынести
                вердикт. В Током на этом этапе мы идём дальше: определяем не
                только типы и номиналы, но и модели приборов и их важные
                характеристики. Учитываем заземление, выделенную мощность и
                число фаз — то, чего «на глаз» обычно не видно.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: Gauge, label: "Номиналы" },
                  { icon: Sparkles, label: "Модели" },
                  { icon: Zap, label: "Фазы и PE" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[16px] bg-zinc-50 px-2 py-3 text-center"
                  >
                    <item.icon className="mx-auto h-4 w-4 text-zinc-700" />
                    <p className="mt-1 ty-meta text-zinc-600">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-4 space-y-4" delay={0.08}>
            <div className="rounded-[28px] border border-black/[0.06] bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D3DA00] ty-heading text-[#111113]">
                  2
                </span>
                <div>
                  <p className="ty-heading text-zinc-900">Реальные нагрузки</p>
                  <p className="ty-meta text-zinc-500">Техника на линиях</p>
                </div>
              </div>
              <StageVisual
                src="/school/overload.png"
                alt="Перегруз линии"
                caption="Один автомат может «держать» кухню — или уже быть на пределе"
              />
              <p className="mt-4 ty-body text-zinc-600">
                Добавьте технику и бытовые приборы, привяжите их к линиям и
                автоматам. Тогда оценка учитывает не абстрактный щиток, а вашу
                реальную квартиру или дом: где кипит чайник, где стиралка, где
                кондиционер. Перегруз и несоответствие розеточных линий
                становятся видимыми — и оценка корректируется.
              </p>
              <div className="mt-4 rounded-[18px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 ty-body text-zinc-600">
                Без нагрузок оценка — осторожный прогноз. С нагрузками — уже
                разговор о вашем доме, а не о «типовом» щитке.
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-4 space-y-4" delay={0.1}>
            <div className="rounded-[28px] border border-black/[0.06] bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D3DA00] ty-heading text-[#111113]">
                  3
                </span>
                <div>
                  <p className="ty-heading text-zinc-900">Расключение</p>
                  <p className="ty-meta text-zinc-500">Кабели, нули, земля, клеммы</p>
                </div>
              </div>
              <WiringDiagram />
              <div className="mt-4">
                <StageVisual
                  src="/school/n-pe-bus.png"
                  alt="Шины N и PE"
                  caption="Корректные нули и земля — основа безопасного щитка"
                />
              </div>
              <p className="mt-4 ty-body text-zinc-600">
                Заключительный этап: как приборы связаны между собой, каким
                кабелем, соответствует ли сечение номиналам и нагрузкам,
                правильно ли собраны нули и земля. Здесь можно дать точное
                заключение о состоянии щитка.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  {
                    icon: Cable,
                    text: "Проверка кабелей под номиналы и нагрузки",
                  },
                  {
                    icon: Wrench,
                    text: "Затяжка кабелей в клеммах как выполненная работа",
                  },
                  {
                    icon: Shield,
                    text: "Цифровая копия щитка с клеммами и кабелями",
                  },
                  {
                    icon: ShieldAlert,
                    text: "Рекомендации по апгрейду, если что-то узкое место",
                  },
                ].map((item) => (
                  <li
                    key={item.text}
                    className="flex items-start gap-3 rounded-[16px] bg-zinc-50 px-3 py-2.5"
                  >
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700" />
                    <span className="ty-body text-zinc-700">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal className="mt-8 mb-2">
            <div className="rounded-[28px] bg-[#111113] p-5 text-white">
              <p className="ty-label text-[#D3DA00]">Зачем это вам</p>
              <h3 className="mt-2 ty-heading text-white">
                Безопасность щитка — это не эстетика DIN-рейки
              </h3>
              <p className="mt-3 ty-body text-white/70">
                От щитка зависят жизнь, жильё и техника. Мнение знакомого может
                успокоить — или напрасно напугать. Пошаговая оценка в сервисе
                опирается на факты, которые можно сохранить, показать мастеру и
                улучшать этап за этапом.
              </p>
              <Button
                className="mt-5 w-full bg-[#D3DA00] text-[#111113] hover:bg-[#c5cc00]"
                onClick={onBack}
              >
                Вернуться к щитку
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </motion.section>
  );
}
