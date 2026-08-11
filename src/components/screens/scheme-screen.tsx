"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import {
  devices as mockDevices,
  linesCount as mockLinesCount,
  safetyScore as mockSafetyScore,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Device, DeviceType } from "@/types";

const typeShort: Record<DeviceType, string> = {
  main_breaker: "Ввод",
  rcd: "УЗО",
  diff_breaker: "Диф",
  voltage_relay: "Реле",
  breaker: "Авт.",
  pe_bus: "PE",
  n_bus: "N",
};

const typeTone: Record<DeviceType, string> = {
  main_breaker: "from-rose-500/25 to-rose-900/20 border-rose-400/30",
  rcd: "from-sky-500/25 to-sky-900/20 border-sky-400/30",
  diff_breaker: "from-cyan-500/20 to-cyan-900/20 border-cyan-400/25",
  voltage_relay: "from-violet-500/25 to-violet-900/20 border-violet-400/30",
  breaker: "from-zinc-500/20 to-zinc-800/30 border-white/15",
  pe_bus: "from-emerald-600/30 to-emerald-900/20 border-emerald-400/30",
  n_bus: "from-blue-600/30 to-blue-900/20 border-blue-400/30",
};

function DeviceBlock({
  device,
  selected,
  onSelect,
}: {
  device: Device;
  selected: boolean;
  onSelect: () => void;
}) {
  const pending = device.status === "pending";
  const isBus = device.type === "pe_bus" || device.type === "n_bus";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col rounded-[14px] border bg-gradient-to-b p-2 text-left transition-all",
        typeTone[device.type],
        isBus
          ? "min-h-[72px] min-w-[72px] flex-[1.2]"
          : "min-h-[120px] min-w-[52px] flex-1",
        selected &&
          "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[#0B0B0F]",
        pending &&
          "border-amber-400/50 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/45">
        {typeShort[device.type]}
      </span>
      <span className="mt-1 line-clamp-2 text-[12px] font-semibold leading-tight text-white">
        {device.name}
      </span>
      <span className="mt-auto text-[11px] tabular-nums text-white/60">
        {device.rating}
      </span>
      {pending && (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      )}
    </button>
  );
}

function DeviceSheet({
  device,
  onClose,
}: {
  device: Device;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[28px] border border-white/10 bg-[#16161d]/95 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[20px] font-semibold text-white">
                {device.name}
              </h3>
              <Badge status={device.status} />
            </div>
            <p className="text-[14px] text-white/45">
              {device.manufacturer ?? "Производитель не определён"} ·{" "}
              {device.rating}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            ["Тип", typeShort[device.type]],
            ["Номинал", device.rating],
            [
              "Статус",
              device.status === "verified" ? "Проверен" : "На проверке",
            ],
            ["ID", `#${device.id}`],
          ].map(([label, value]) => (
            <GlassCard key={label} className="p-3">
              <div className="text-[12px] text-white/40">{label}</div>
              <div className="mt-1 text-[15px] font-medium text-white">
                {value}
              </div>
            </GlassCard>
          ))}
        </div>

        {typeof device.confidence === "number" && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="text-white/50">Вероятность распознавания</span>
              <span className="font-medium text-white">{device.confidence}%</span>
            </div>
            <Progress value={device.confidence} />
          </div>
        )}

        <Button className="w-full" onClick={onClose}>
          <BreakerIcon className="h-4 w-4" />
          Понятно
        </Button>
      </motion.div>
    </motion.div>
  );
}

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
          Например: «Квартира», «Дача», «Щиток на кухне»
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Название щитка"
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

function safetyLabel(score: number): string {
  if (score >= 80) return "хороший";
  if (score >= 60) return "средний";
  return "низкий";
}

export function SchemeScreen({
  title = "Щиток",
  photoDataUrl,
  askNameOnBack = false,
  onBack,
  onRename,
  onDelete,
  devices: devicesProp,
  safetyScore: safetyProp,
  linesCount: linesProp,
}: {
  title?: string;
  photoDataUrl?: string | null;
  askNameOnBack?: boolean;
  onBack: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  devices?: Device[];
  safetyScore?: number;
  linesCount?: number;
}) {
  const devices =
    devicesProp && devicesProp.length > 0 ? devicesProp : mockDevices;
  const safetyScore = safetyProp ?? mockSafetyScore;
  const linesCount = linesProp ?? mockLinesCount;

  const [tab, setTab] = useState<"scheme" | "photo">("scheme");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameOnBackOpen, setNameOnBackOpen] = useState(false);
  const selected = devices.find((d) => d.id === selectedId) ?? null;

  const railDevices = devices.filter(
    (d) => d.type !== "pe_bus" && d.type !== "n_bus",
  );
  const busDevices = devices.filter(
    (d) => d.type === "pe_bus" || d.type === "n_bus",
  );

  const verified = devices.filter((d) => d.status === "verified").length;
  const pending = devices.filter((d) => d.status === "pending").length;
  const unknown = devices.filter((d) => d.status === "unknown").length;

  const railMinWidth = Math.max(320, railDevices.length * 58 + 48);

  const handleBack = () => {
    if (askNameOnBack) {
      setNameOnBackOpen(true);
      return;
    }
    onBack();
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative flex min-h-dvh flex-col overflow-hidden pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <header className="mb-4 flex items-center justify-between px-5">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="max-w-[55%] truncate text-center text-[20px] font-semibold text-white">
          {title}
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
                    setDeleteOpen(true);
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

      <div className="mb-3 flex gap-2 px-5">
        <button
          type="button"
          onClick={() => setTab("scheme")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
            tab === "scheme"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70",
          )}
        >
          Схема
        </button>
        <button
          type="button"
          onClick={() => setTab("photo")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
            tab === "photo"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70",
          )}
        >
          Фото
        </button>
      </div>

      {tab === "scheme" ? (
        <div className="flex-1 overflow-x-auto px-5 pb-4">
          <GlassCard className="p-4" style={{ minWidth: railMinWidth }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-medium text-white/50">
                DIN-рейка
              </span>
              <span className="text-[12px] text-white/35">
                {railDevices.length} модулей
              </span>
            </div>

            <div className="mb-3 h-2 rounded-full bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 shadow-inner" />

            <div className="mb-4 flex gap-1.5">
              {railDevices.map((device) => (
                <DeviceBlock
                  key={device.id}
                  device={device}
                  selected={selectedId === device.id}
                  onSelect={() => setSelectedId(device.id)}
                />
              ))}
            </div>

            {busDevices.length > 0 && (
              <>
                <div className="mb-2 text-[13px] font-medium text-white/50">
                  Шины
                </div>
                <div className="flex gap-2">
                  {busDevices.map((device) => (
                    <DeviceBlock
                      key={device.id}
                      device={device}
                      selected={selectedId === device.id}
                      onSelect={() => setSelectedId(device.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </GlassCard>

          <div className="mt-4 flex gap-4 text-[12px] text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Определён ({verified})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Требует проверки ({pending})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
              Не определён ({unknown})
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <GlassCard className="overflow-hidden p-0">
            {photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt="Фото щитка"
                className="max-h-[60vh] w-full object-contain bg-black"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 text-white/40">
                <ImageIcon className="h-10 w-10" />
                <p className="text-[14px]">Фото щитка недоступно</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      <div className="border-t border-white/8 bg-[#0B0B0F]/80 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4">
            <div className="mb-1 text-[12px] text-white/40">Количество линий</div>
            <div className="text-[28px] font-bold tabular-nums text-white">
              {linesCount}
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] text-white/40">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              Уровень безопасности
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[28px] font-bold tabular-nums text-emerald-300">
                {safetyScore}%
              </span>
              <span className="mb-1.5 text-[12px] text-white/40">
                {safetyLabel(safetyScore)}
              </span>
            </div>
            <Progress value={safetyScore} className="mt-2 h-1.5" />
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {selected && tab === "scheme" && (
          <DeviceSheet device={selected} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>

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
            title="Переименовать щиток"
            initialValue={title}
            confirmLabel="Сохранить"
            onCancel={() => setRenameOpen(false)}
            onConfirm={(name) => {
              onRename(name);
              setRenameOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nameOnBackOpen && (
          <NameDialog
            title="Как назвать этот щиток?"
            initialValue={title.startsWith("Щиток ") ? "" : title}
            confirmLabel="Сохранить"
            onCancel={() => {
              setNameOnBackOpen(false);
              onBack();
            }}
            onConfirm={(name) => {
              onRename(name);
              setNameOnBackOpen(false);
              onBack();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteOpen && (
          <ConfirmDialog
            title="Удалить щиток?"
            description="Щиток и его схема будут удалены без возможности восстановления."
            confirmLabel="Удалить"
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              setDeleteOpen(false);
              onDelete();
            }}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
