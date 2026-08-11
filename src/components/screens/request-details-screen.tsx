"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import type { InstallRequest } from "@/types";

function NameDialog({
  title,
  initialValue,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  initialValue: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[28px] border border-white/10 bg-[#16161d] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
      >
        <h3 className="mb-2 text-[20px] font-semibold text-white">{title}</h3>
        <p className="mb-4 text-[14px] text-white/50">
          Например: «Установка на даче», «Щиток в квартире»
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Название заявки"
          className="mb-4 h-14 w-full rounded-[20px] border border-white/10 bg-white/[0.06] px-4 text-[16px] text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
          }}
        />
        <div className="flex gap-3">
          <Button className="flex-1" variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RequestDetailsScreen({
  request,
  onBack,
  onRename,
  onDelete,
}: {
  request: InstallRequest;
  onBack: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

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
      className="relative flex min-h-dvh flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-center text-[20px] font-semibold text-white">
          Детали заявки
        </h1>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
            aria-label="Ещё"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                className="absolute right-0 top-12 z-30 min-w-[180px] overflow-hidden rounded-[18px] border border-white/10 bg-[#1b1b24]/95 shadow-2xl backdrop-blur-xl"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-white hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 text-white/60" />
                  Переименовать
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-rose-300 hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="mb-5 flex items-center gap-3 rounded-[20px] border border-rose-400/30 bg-rose-500/10 p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-rose-500/20 text-rose-300">
          <ClipboardList className="h-6 w-6" />
        </span>
        <div>
          <div className="text-[18px] font-semibold text-rose-100">
            {request.title}
          </div>
          <div className="text-[13px] text-rose-100/70">{request.subtitle}</div>
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

      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            aria-label="Закрыть меню"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameOpen && (
          <NameDialog
            title="Переименовать заявку"
            initialValue={request.title}
            confirmLabel="Сохранить"
            onCancel={() => setRenameOpen(false)}
            onConfirm={(name) => {
              onRename(name);
              setRenameOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
