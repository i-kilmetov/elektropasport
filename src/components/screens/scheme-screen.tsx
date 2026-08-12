"use client";

import { useEffect, useMemo, useState } from "react";
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
import { BrandMark } from "@/components/icons/brand-mark";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import {
  DeviceFace,
  DeviceStatusBar,
  DEVICE_GAP_PX,
  MODULE_PX,
} from "@/components/icons/device-face";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { SpecCharacteristicCard } from "@/components/ui/spec-info-button";
import { circuitIdentifySteps } from "@/lib/device-catalog";
import { PanelDeviceGuideSection } from "@/components/screens/panel-device-guide-section";
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
  spd: "УЗИП",
  afdd: "УЗДП",
  pe_bus: "PE",
  n_bus: "N",
};

function deviceModules(device: Device): number {
  if (device.modules && device.modules > 0) return device.modules;
  return 1;
}

function DeviceBlock({
  device,
  selected,
  showTerminals,
  onSelect,
}: {
  device: Device;
  selected: boolean;
  showTerminals: boolean;
  onSelect: (clientY: number) => void;
}) {
  const modules = deviceModules(device);
  const width = modules * MODULE_PX;

  return (
    <div className="flex flex-col items-stretch" style={{ width, flex: "none" }}>
      <span className="mb-1 line-clamp-1 text-left text-[10px] font-medium leading-tight text-white/55">
        {typeShort[device.type]}
      </span>
      <DeviceFace
        device={device}
        modules={modules}
        selected={selected}
        showTerminals={showTerminals}
        onSelect={(event) => onSelect(event.clientY)}
        brand={
          <BrandMark brandKey={device.brandKey} brand={device.manufacturer} />
        }
      />
      <DeviceStatusBar status={device.status} />
      {device.circuitLabel?.trim() && (
        <span className="mt-1 line-clamp-2 text-left text-[10px] font-medium leading-tight text-white/70">
          {device.circuitLabel.trim()}
        </span>
      )}
    </div>
  );
}

function computeSheetTop(anchorY: number | null): number {
  if (typeof window === "undefined") return 80;
  const margin = 12;
  const maxH = window.innerHeight * 0.85;
  if (anchorY === null) {
    return Math.max(margin, window.innerHeight - maxH - margin);
  }
  let top = anchorY - 56;
  top = Math.max(margin, top);
  top = Math.min(top, window.innerHeight - maxH - margin);
  return top;
}

function DeviceSheet({
  device,
  anchorY,
  onClose,
  onAssignCircuit,
}: {
  device: Device;
  anchorY: number | null;
  onClose: () => void;
  onAssignCircuit: (deviceId: number, label: string) => void;
}) {
  const [label, setLabel] = useState(device.circuitLabel ?? "");
  const [sheetTop, setSheetTop] = useState(() => computeSheetTop(anchorY));
  const specs = useMemo(() => {
    const fromCatalog = Object.entries(device.characteristics ?? {});
    if (fromCatalog.length > 0) return fromCatalog;
    return [
      ["Тип", typeShort[device.type]],
      ["Номинал", device.rating],
      ["Производитель", device.manufacturer ?? "—"],
      ["Модули", String(deviceModules(device))],
    ] as Array<[string, string]>;
  }, [device]);

  useEffect(() => {
    setLabel(device.circuitLabel ?? "");
  }, [device.circuitLabel, device.id]);

  useEffect(() => {
    setSheetTop(computeSheetTop(anchorY));
    const onResize = () => setSheetTop(computeSheetTop(anchorY));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anchorY, device.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        style={{ top: sheetTop }}
        className="fixed left-0 right-0 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#16161d]/95 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <BrandMark brandKey={device.brandKey} brand={device.manufacturer} />
              <h3 className="text-[20px] font-semibold text-white">
                {device.name}
              </h3>
              <Badge status={device.status} />
            </div>
            <p className="text-[14px] text-white/45">
              {device.manufacturer ?? "Производитель не определён"}
              {device.model ? ` · ${device.model}` : ` · ${device.rating}`}
            </p>
            {device.circuitLabel?.trim() && (
              <p className="mt-1 text-[13px] text-white/60">
                Линия: {device.circuitLabel.trim()}
              </p>
            )}
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
          {specs.slice(0, 6).map(([key, value]) => (
            <SpecCharacteristicCard key={key} label={key} value={value} />
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

        <GlassCard className="mb-5 space-y-3 p-4">
          <div className="text-[15px] font-semibold text-white">
            Как определить, за что отвечает прибор
          </div>
          <p className="text-[13px] leading-relaxed text-white/50">
            После фотографии помещение ещё неизвестно. Пройдите шаги ниже и
            подпишите линию сами.
          </p>
          <ol className="space-y-2.5">
            {circuitIdentifySteps.map((step, index) => (
              <li
                key={step}
                className="flex gap-2.5 text-[13px] leading-relaxed text-white/75"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Например: Кухня розетки"
            className="h-12 w-full rounded-[16px] border border-white/10 bg-white/[0.06] px-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[var(--accent)]/50"
          />
          <Button
            className="w-full"
            variant="secondary"
            disabled={!label.trim()}
            onClick={() => {
              onAssignCircuit(device.id, label.trim());
            }}
          >
            Сохранить название линии
          </Button>
        </GlassCard>

        <Button className="w-full" onClick={onClose}>
          <BreakerIcon className="h-4 w-4" />
          Закрыть
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
  onAssignCircuit,
  devices: devicesProp,
  safetyScore: safetyProp,
  linesCount: linesProp,
  railCount,
}: {
  title?: string;
  photoDataUrl?: string | null;
  askNameOnBack?: boolean;
  onBack: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAssignCircuit?: (deviceId: number, label: string) => void;
  devices?: Device[];
  safetyScore?: number;
  linesCount?: number;
  railCount?: number;
}) {
  const devices =
    devicesProp && devicesProp.length > 0 ? devicesProp : mockDevices;
  const safetyScore = safetyProp ?? mockSafetyScore;
  const linesCount = linesProp ?? mockLinesCount;

  const [tab, setTab] = useState<"scheme" | "photo">("scheme");
  const [showTerminals, setShowTerminals] = useState(false);
  const [sheetAnchorY, setSheetAnchorY] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameOnBackOpen, setNameOnBackOpen] = useState(false);
  const selected = devices.find((d) => d.id === selectedId) ?? null;

  const allRailDevices = devices.filter(
    (d) => d.type !== "pe_bus" && d.type !== "n_bus",
  );

  // Group devices by rail
  const numRails = railCount ?? Math.max(1, ...allRailDevices.map((d) => (d.rail ?? 0) + 1));
  const rails = useMemo(() => {
    const grouped: Device[][] = Array.from({ length: numRails }, () => []);
    for (const d of allRailDevices) {
      const r = Math.min(d.rail ?? 0, numRails - 1);
      grouped[r].push(d);
    }
    return grouped;
  }, [allRailDevices, numRails]);

  const verified = devices.filter((d) => d.status === "verified").length;
  const pending = devices.filter((d) => d.status === "pending").length;
  const unknown = devices.filter((d) => d.status === "unknown").length;

  // widest rail determines the panel width
  const widestRailModules = Math.max(
    ...rails.map((rd) => rd.reduce((s, d) => s + deviceModules(d), 0)),
  );
  const widestRailDevices = Math.max(...rails.map((rd) => rd.length));
  const railMinWidth = Math.max(
    320,
    widestRailModules * MODULE_PX +
      Math.max(0, widestRailDevices - 1) * DEVICE_GAP_PX +
      32,
  );

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

      <div className="mb-3 flex items-center gap-2 px-5">
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
        {tab === "scheme" && (
          <button
            type="button"
            role="switch"
            aria-checked={showTerminals}
            aria-label="Показать клеммы для проводов"
            onClick={() => setShowTerminals((v) => !v)}
            className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5"
          >
            <span className="text-[12px] font-medium text-white/55">Клеммы</span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                showTerminals ? "bg-emerald-500/90" : "bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  showTerminals ? "left-4" : "left-0.5",
                )}
              />
            </span>
          </button>
        )}
      </div>

      {tab === "scheme" ? (
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="overflow-x-auto">
            <GlassCard className="p-4" style={{ minWidth: railMinWidth }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-medium text-white/50">
                {numRails > 1 ? `${numRails} DIN-рейки` : "DIN-рейка"}
              </span>
              <span className="text-[12px] text-white/35">
                {allRailDevices.length} приборов
              </span>
            </div>

            {rails.map((railDevices, railIdx) => {
              const railModules = railDevices.reduce(
                (s, d) => s + deviceModules(d),
                0,
              );
              return (
                <div key={railIdx} className={railIdx > 0 ? "mt-5" : ""}>
                  {numRails > 1 && (
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-white/35">
                        Ряд {railIdx + 1}
                      </span>
                      <span className="text-[11px] text-white/25">
                        {railModules} мод.
                      </span>
                    </div>
                  )}
                  <div className="mb-2 h-2 rounded-full bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 shadow-inner" />
                  <div
                    className="mb-2 flex items-start"
                    style={{ gap: DEVICE_GAP_PX }}
                  >
                    {railDevices.map((device) => (
                      <DeviceBlock
                        key={device.id}
                        device={device}
                        selected={selectedId === device.id}
                        showTerminals={showTerminals}
                        onSelect={(clientY) => {
                          setSheetAnchorY(clientY);
                          setSelectedId(device.id);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </GlassCard>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-white/50">
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

          <PanelDeviceGuideSection devices={allRailDevices} />
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
          <DeviceSheet
            device={selected}
            anchorY={sheetAnchorY}
            onClose={() => {
              setSelectedId(null);
              setSheetAnchorY(null);
            }}
            onAssignCircuit={(deviceId, circuitLabel) => {
              onAssignCircuit?.(deviceId, circuitLabel);
            }}
          />
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
