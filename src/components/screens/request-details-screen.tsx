"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ClipboardList, MapPin, MessageCircle, Phone, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { InstallRequest } from "@/types";

export function RequestDetailsScreen({
  request,
  onBack,
}: {
  request: InstallRequest;
  onBack: () => void;
}) {
  const dwellingLabel =
    request.dwelling === "house"
      ? "Дом"
      : request.dwelling === "apartment"
        ? "Квартира"
        : "—";

  const rows: Array<[string, string]> = [
    ["Статус", request.statusLabel],
    ["Город", request.city],
    ["Контакт", request.contactMethod === "telegram" ? "Telegram" : "Телефон"],
    [
      request.contactMethod === "telegram" ? "Имя в Telegram" : "Телефон",
      request.contactMethod === "telegram"
        ? request.name
        : (request.phone ?? "—"),
    ],
    ["Имя", request.name],
    ["Объект", dwellingLabel],
    ["Фаз", request.phases ? `${request.phases}` : "—"],
    ["Мощность", request.powerKw ? `${request.powerKw} кВт` : "—"],
    ["Текущая схема", request.setupTitle ?? "—"],
    ["Дата заявки", request.createdAt],
  ];

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
        <h1 className="text-[20px] font-semibold text-white">Детали заявки</h1>
      </header>

      <div className="mb-5 flex items-center gap-3 rounded-[20px] border border-rose-400/30 bg-rose-500/10 p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-rose-500/20 text-rose-300">
          <ClipboardList className="h-6 w-6" />
        </span>
        <div>
          <div className="text-[18px] font-semibold text-rose-100">Заявка</div>
          <div className="text-[13px] text-rose-100/70">На установку щитка</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {rows.map(([label, value]) => (
          <GlassCard key={label} className="flex items-start gap-3 p-4">
            <span className="mt-0.5 text-white/35">
              {label === "Город" ? (
                <MapPin className="h-4 w-4" />
              ) : label === "Контакт" || label.startsWith("Телефон") ? (
                request.contactMethod === "telegram" ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )
              ) : label === "Имя" || label.includes("Telegram") ? (
                <User className="h-4 w-4" />
              ) : label === "Статус" ? (
                <Zap className="h-4 w-4" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
            </span>
            <div>
              <div className="text-[12px] text-white/40">{label}</div>
              <div className="mt-0.5 text-[15px] font-medium text-white">
                {value}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-auto pt-2">
        <Button className="w-full" variant="secondary" onClick={onBack}>
          Назад к списку
        </Button>
      </div>
    </motion.section>
  );
}
