"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  Hammer,
  Headphones,
  MapPin,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { hapticNotification } from "@/lib/haptics";
import {
  buildMasterReferralUrl,
  MASTER_REFERRAL_SHARE_TEXT,
  shareViaTelegram,
} from "@/lib/panel-share";

const workTypes = [
  {
    icon: MessageCircle,
    title: "Консультации онлайн",
    text: "Разбираем ситуацию по схеме щитка, фото и описанию — в чате или по телефону.",
  },
  {
    icon: Headphones,
    title: "Поддержка по телефону",
    text: "Помогаете пользователю понять, что происходит в щитке и что делать дальше.",
  },
  {
    icon: MapPin,
    title: "Выезд по заявке",
    text: "Оценка текущего состояния, схемы электрики, прозвонка линий и рекомендации на объекте.",
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
  "Укажете город, где готовы работать",
  "Приложите фото диплома, свидетельства или удостоверения",
  "Сдадите экзамен 3 класса школы Током",
  "Коротко расскажете о себе и оставите телефон",
] as const;

export function BecomeMasterScreen({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#111113] text-white"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="mb-6 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-none pb-4">
        <div className="pt-2">
          <h1 className="text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
            Переходи на сторону
          </h1>
          <BrandLogo className="mt-4 h-12 sm:h-14" onDark />
          <p className="mt-5 max-w-[34ch] text-[15px] leading-relaxed text-white/55">
            Мы ищем сильных специалистов, которые аккуратно работают с
            электрикой, умеют объяснять простым языком и отвечают за результат.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-[15px] font-semibold text-white">
            Какие задачи бывают
          </h2>
          <div className="space-y-2.5">
            {workTypes.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                className="flex gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#D3DA00]/15 text-[#D3DA00]">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-white">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/45">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
          <span className="mt-0.5 text-[#D3DA00]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <div className="mb-1 text-[15px] font-semibold text-white">
              Обязательное условие
            </div>
            <p className="text-[13px] leading-relaxed text-white/45">
              Профильное образование и подтверждённая квалификация. Без этого мы
              не подключаем мастеров к заявкам сервиса — это вопрос безопасности
              пользователей.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-[20px] border border-white/8 bg-white/[0.04] p-4">
          <h2 className="text-[15px] font-semibold text-white">
            Как подать заявку
          </h2>
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 text-[14px] leading-relaxed text-white/55"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D3DA00] text-[12px] font-semibold text-[#111113]">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-auto shrink-0 space-y-3 pt-3">
        <Button
          className="w-full border-0 !bg-[#D3DA00] text-[#111113] shadow-none hover:!bg-[#c8cf00] hover:brightness-100"
          size="lg"
          onClick={onConfirm}
        >
          Отправить заявку
        </Button>
        <button
          type="button"
          onClick={() => {
            void shareViaTelegram(
              buildMasterReferralUrl(),
              MASTER_REFERRAL_SHARE_TEXT,
            ).catch((error) => {
              console.error(error);
              hapticNotification("error");
            });
          }}
          className="w-full text-center text-[15px] font-medium text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/70"
        >
          Знаете хорошего электрика? Посоветуйте нам
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-[15px] font-medium text-white/35 transition-colors hover:text-white/60"
        >
          Не сейчас
        </button>
      </div>
      </div>
    </motion.section>
  );
}
