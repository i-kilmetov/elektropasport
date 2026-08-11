"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

export function AboutServiceScreen({ onBack }: { onBack: () => void }) {
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">О сервисе</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        <div>
          <h2 className="mb-2 text-[26px] font-bold tracking-tight text-white">
            Электропаспорт
          </h2>
          <p className="text-[15px] leading-relaxed text-white/55">
            Сервис помогает навести порядок в домашней электрике: сохранить
            схему щитка, понять состав устройств и быстро связаться с мастером,
            если щитка нет или нужна установка.
          </p>
        </div>

        <GlassCard className="space-y-3 p-4">
          <h3 className="text-[16px] font-semibold text-white">Что мы делаем</h3>
          <p className="text-[14px] leading-relaxed text-white/55">
            Вы фотографируете щиток — мы формируем понятную схему и карточку
            объекта. Если щитка нет, помогаем описать ситуацию и оставить заявку
            на установку. Все ваши щитки и заявки сохраняются в аккаунте
            Telegram.
          </p>
        </GlassCard>

        <GlassCard className="space-y-3 p-4">
          <h3 className="text-[16px] font-semibold text-white">Для кого</h3>
          <p className="text-[14px] leading-relaxed text-white/55">
            Для владельцев квартир и домов, которым важно понимать свою
            электрику без сложных терминов — и для тех, кто хочет вызвать
            проверенного специалиста без долгих поисков.
          </p>
        </GlassCard>

        <GlassCard className="space-y-3 p-4">
          <h3 className="text-[16px] font-semibold text-white">Важно знать</h3>
          <p className="text-[14px] leading-relaxed text-white/55">
            Электропаспорт не заменяет проектную документацию и очный осмотр
            электрика. Сервис помогает структурировать информацию и ускорить
            связь с мастером, но работы с напряжением должен выполнять
            квалифицированный специалист.
          </p>
        </GlassCard>
      </div>

      <Button className="mt-auto w-full" variant="secondary" onClick={onBack}>
        Назад
      </Button>
    </motion.section>
  );
}
