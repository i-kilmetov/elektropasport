"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Hammer,
  Headphones,
  MapPin,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { BrandLogo, BRAND_YELLOW } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const workTypes = [
  {
    icon: MessageCircle,
    title: "Консультации онлайн",
    text: "Разбираете ситуацию по схеме щитка, фото и описанию — в чате или по телефону.",
  },
  {
    icon: Headphones,
    title: "Поддержка по телефону",
    text: "Помогаете пользователю понять, что происходит в щитке и что делать дальше.",
  },
  {
    icon: MapPin,
    title: "Выезд по заявке",
    text: "Оценка электрики на объекте, прозвонка линий и понятные рекомендации.",
  },
  {
    icon: Wrench,
    title: "Сборка щитков",
    text: "Подбор и сборка щитка под задачи объекта — от квартиры до частного дома.",
  },
  {
    icon: Hammer,
    title: "Монтаж и подключение",
    text: "Установка щитка, прокладка линий, замена автоматов, УЗО и других устройств.",
  },
] as const;

const steps = [
  "Войдите через Telegram",
  "Расскажите о городе и опыте",
  "Оставьте контакт для связи",
  "Мы обсудим формат сотрудничества",
] as const;

export function JobLandingPage() {
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    document.documentElement.style.backgroundColor = "#0a0a0a";
    return () => {
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  const startApplication = () => {
    setStarting(true);
    try {
      sessionStorage.setItem("ep_intent", "become-master");
    } catch {
      // private mode
    }
    window.location.assign("/api/auth/telegram/start");
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white">
      <section className="relative flex min-h-dvh flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% -10%, rgba(211,218,0,0.28), transparent 55%),
              radial-gradient(ellipse 60% 40% at 100% 80%, rgba(211,218,0,0.08), transparent 50%),
              linear-gradient(180deg, #0a0a0a 0%, #111 100%)
            `,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-10">
          <a href="/" className="inline-flex">
            <BrandLogo className="h-8 md:h-9" onDark />
          </a>
          <a
            href="/"
            className="ty-label text-white/45 transition-colors hover:text-white/70"
          >
            В сервис
          </a>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-16 md:px-10 md:py-20">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 ty-label uppercase tracking-[0.22em] text-[#D3DA00]"
          >
            Работа в Током
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="max-w-[16ch] text-[42px] font-bold leading-[1.02] tracking-tight md:text-[64px]"
          >
            Станьте мастером сервиса{" "}
            <span className="text-[#D3DA00]">Током</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/55 md:text-[19px]"
          >
            Ищем электриков, которые аккуратно работают со схемами, умеют
            объяснять простым языком и отвечают за результат — от онлайн-помощи
            до выезда и монтажа.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button
              size="lg"
              disabled={starting}
              onClick={startApplication}
              className="h-12 rounded-full px-8 ty-heading text-zinc-950 shadow-none hover:brightness-95"
              style={{ backgroundColor: BRAND_YELLOW }}
            >
              {starting ? "Открываем Telegram…" : "Стать мастером"}
            </Button>
            <p className="text-[13px] text-white/40 sm:max-w-[220px]">
              Вход через Telegram — заявка займёт пару минут
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-white/8 px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="ty-display md:text-[36px]">
            Какие задачи бывают
          </h2>
          <p className="mt-3 max-w-2xl ty-body text-white/50">
            Один поток заявок — разные форматы работы. Выбираете то, что
            подходит вам по городу, опыту и загрузке.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {workTypes.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: 0.04 * i, duration: 0.4 }}
                className="border-t border-white/10 pt-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#D3DA00]/15 text-[#D3DA00]">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="ty-title text-white">
                  {item.title}
                </h3>
                <p className="mt-2 ty-body text-white/50">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-10 md:py-20">
        <div
          className="mx-auto max-w-5xl overflow-hidden rounded-[28px] px-6 py-10 md:px-12 md:py-14"
          style={{ backgroundColor: BRAND_YELLOW }}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md text-zinc-950">
              <GraduationCap className="mb-4 h-7 w-7" />
              <h2 className="ty-display md:text-[32px]">
                Обязательное условие
              </h2>
              <p className="mt-3 ty-body text-zinc-800">
                Профильное образование и подтверждённая квалификация. Без этого
                мы не подключаем мастеров к заявкам — это вопрос безопасности
                пользователей.
              </p>
            </div>
            <ol className="max-w-sm space-y-3 text-zinc-950">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-[15px] font-medium">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[12px] font-bold text-[#D3DA00]">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-10">
            <Button
              size="lg"
              disabled={starting}
              onClick={startApplication}
              className="rounded-full bg-zinc-950 px-8 text-white shadow-none hover:bg-zinc-800"
            >
              {starting ? "Открываем Telegram…" : "Подать заявку"}
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo className="h-7" onDark />
          <p className={cn("text-[13px] text-white/35")}>
            © {new Date().getFullYear()} Током ·{" "}
            <a href="/" className="underline-offset-2 hover:underline">
              tokom.ru
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
