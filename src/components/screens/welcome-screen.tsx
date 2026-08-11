"use client";

import { motion } from "framer-motion";
import { Building2, Check, Home, Shield } from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { Button } from "@/components/ui/button";

const features = [
  { icon: BreakerIcon, text: "Цифровая схема щитка" },
  { icon: Home, text: "Идентификация линий" },
  { icon: Shield, text: "Рекомендации по безопасности" },
  { icon: Building2, text: "История проверок" },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45 }}
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-[max(3rem,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--accent)]/25 blur-[90px]" />
        <div className="absolute bottom-24 right-0 h-48 w-48 rounded-full bg-violet-700/20 blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.1 }}
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/15 bg-white/10 shadow-[0_0_60px_rgba(124,92,255,0.45)] backdrop-blur-xl"
        >
          <BreakerIcon className="h-12 w-12 text-[var(--accent)]" />
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 text-[34px] font-bold tracking-tight text-white"
        >
          Электропаспорт
        </motion.h1>

        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mb-10 max-w-[280px] text-[17px] leading-relaxed text-white/65"
        >
          Создайте цифровой паспорт своего щитка
        </motion.p>

        <ul className="mb-12 w-full max-w-sm space-y-3 text-left">
          {features.map((item, i) => (
            <motion.li
              key={item.text}
              initial={{ x: -12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3 backdrop-blur-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[15px] text-white/85">{item.text}</span>
              <Check className="h-4 w-4 text-emerald-400/80" />
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="relative z-10"
      >
        <Button className="w-full" size="lg" onClick={onStart}>
          Начать
        </Button>
      </motion.div>
    </motion.section>
  );
}
