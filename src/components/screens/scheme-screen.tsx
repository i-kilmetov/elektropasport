"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  MoreHorizontal,
  Shield,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { devices, linesCount, safetyScore } from "@/lib/mock-data";
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
        isBus ? "min-h-[72px] min-w-[72px] flex-[1.2]" : "min-h-[120px] min-w-[52px] flex-1",
        selected && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[#0B0B0F]",
        pending && "border-amber-400/50 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
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
              <h3 className="text-[20px] font-semibold text-white">{device.name}</h3>
              <Badge status={device.status} />
            </div>
            <p className="text-[14px] text-white/45">
              {device.manufacturer ?? "Производитель не определён"} · {device.rating}
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
            ["Статус", device.status === "verified" ? "Проверен" : "На проверке"],
            ["ID", `#${device.id}`],
          ].map(([label, value]) => (
            <GlassCard key={label} className="p-3">
              <div className="text-[12px] text-white/40">{label}</div>
              <div className="mt-1 text-[15px] font-medium text-white">{value}</div>
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
          <Zap className="h-4 w-4" />
          Понятно
        </Button>
      </motion.div>
    </motion.div>
  );
}

export function SchemeScreen({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
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
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[20px] font-semibold text-white">Щиток</h1>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-xl"
          aria-label="Ещё"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-3 flex gap-2 px-5">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white">
          Схема
        </span>
        <span className="rounded-full px-3 py-1.5 text-[13px] text-white/40">
          Список
        </span>
      </div>

      {/* Top: interactive DIN scheme */}
      <div className="flex-1 overflow-x-auto px-5 pb-4">
        <GlassCard className="min-w-[520px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-medium text-white/50">DIN-рейка</span>
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

          <div className="mb-2 text-[13px] font-medium text-white/50">Шины</div>
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

      {/* Bottom: lines + safety */}
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
              <span className="mb-1.5 text-[12px] text-white/40">хороший</span>
            </div>
            <Progress value={safetyScore} className="mt-2 h-1.5" />
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <DeviceSheet device={selected} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
