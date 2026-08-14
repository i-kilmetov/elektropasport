"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { IosShareIcon } from "@/components/icons/ios-share-icon";
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
import { ShareSheet } from "@/components/ui/share-sheet";
import { Progress } from "@/components/ui/progress";
import { HintInfoButton } from "@/components/ui/spec-info-button";
import { SafetyParamsSheet } from "@/components/ui/safety-params-sheet";
import { EditableSpecCard } from "@/components/ui/editable-spec-card";
import { circuitIdentifySteps } from "@/lib/device-catalog";
import { devices as mockDevices } from "@/lib/mock-data";
import { deviceTypeGuide } from "@/lib/panel-device-guide";
import {
  manualSpecEditDisclaimer,
} from "@/lib/device-spec-guide";
import {
  computePanelSafetyScore,
  safetyIndicatorColor,
  safetyLabel,
  safetyScoreDisclaimer,
  safetyTextColor,
} from "@/lib/safety-score";
import { PanelDeviceGuideSection } from "@/components/screens/panel-device-guide-section";
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
  onSelect,
  onTogglePower,
}: {
  device: Device;
  selected: boolean;
  onSelect: (clientY: number) => void;
  onTogglePower?: (deviceId: number) => void;
}) {
  const modules = deviceModules(device);
  const width = modules * MODULE_PX;

  return (
    <div className="flex flex-col items-stretch" style={{ width, flex: "none" }}>
      <span className="mb-1 line-clamp-1 text-left text-[10px] font-medium leading-tight text-zinc-500">
        {typeShort[device.type]}
      </span>
      <DeviceFace
        device={device}
        modules={modules}
        selected={selected}
        showTerminals={false}
        onSelect={(event) => onSelect(event.clientY)}
        onLongPress={() => onTogglePower?.(device.id)}
        brand={
          <BrandMark brandKey={device.brandKey} brand={device.manufacturer} />
        }
      />
      <DeviceStatusBar status={device.status} />
      {device.circuitLabel?.trim() && (
        <span className="mt-1 line-clamp-2 text-left text-[10px] font-medium leading-tight text-zinc-600">
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

function deviceTitle(device: Device): string {
  if (device.type === "pe_bus" || device.type === "n_bus") {
    return device.name;
  }
  return deviceTypeGuide[device.type]?.title ?? device.name;
}

function DeviceSheet({
  device,
  anchorY,
  onClose,
  onAssignCircuit,
  onUpdateCharacteristic,
  specEditable = true,
}: {
  device: Device;
  anchorY: number | null;
  onClose: () => void;
  onAssignCircuit: (deviceId: number, label: string) => void;
  onUpdateCharacteristic?: (
    deviceId: number,
    key: string,
    value: string,
  ) => void;
  specEditable?: boolean;
}) {
  const [label, setLabel] = useState(device.circuitLabel ?? "");
  const [sheetTop, setSheetTop] = useState(() => computeSheetTop(anchorY));
  const specs = useMemo(() => {
    const hidden = new Set(["Производитель", "Модель"]);
    const fromCatalog = Object.entries(device.characteristics ?? {}).filter(
      ([key]) => !hidden.has(key),
    );
    if (fromCatalog.length > 0) return fromCatalog;
    return [
      ["Тип", typeShort[device.type]],
      ["Номинал", device.rating],
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
        className="fixed left-0 right-0 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[20px] font-semibold text-zinc-900">
                {deviceTitle(device)}
              </h3>
              <Badge status={device.status} />
            </div>
            <p className="text-[14px] text-zinc-500">{device.rating}</p>
            <p className="mt-1 text-[12px] text-zinc-400">
              На схеме удержите прибор, чтобы переключить состояние
            </p>
            {device.circuitLabel?.trim() && (
              <p className="mt-1 text-[13px] text-zinc-600">
                Линия: {device.circuitLabel.trim()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {specEditable && onUpdateCharacteristic && (
          <p className="mb-3 text-[12px] leading-relaxed text-amber-800/90">
            {manualSpecEditDisclaimer}
          </p>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3">
          {specs.slice(0, 6).map(([key, value]) => (
            <EditableSpecCard
              key={key}
              deviceType={device.type}
              label={key}
              value={value}
              editable={specEditable}
              onChange={
                onUpdateCharacteristic
                  ? (next) => onUpdateCharacteristic(device.id, key, next)
                  : undefined
              }
            />
          ))}
        </div>

        {typeof device.confidence === "number" && (
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="text-zinc-500">Вероятность распознавания</span>
              <span className="font-medium text-zinc-900">{device.confidence}%</span>
            </div>
            <Progress value={device.confidence} />
          </div>
        )}

        <GlassCard className="mb-5 space-y-3 p-4">
          <div className="text-[15px] font-semibold text-zinc-900">
            Как определить, за что отвечает прибор
          </div>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            После фотографии помещение ещё неизвестно. Пройдите шаги ниже и
            подпишите линию сами.
          </p>
          <ol className="space-y-2.5">
            {circuitIdentifySteps.map((step, index) => (
              <li
                key={step}
                className="flex gap-2.5 text-[13px] leading-relaxed text-zinc-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
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
            className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
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
        className="w-full rounded-t-[28px] border border-black/8 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-[28px]"
      >
        <h3 className="mb-2 text-[20px] font-semibold text-zinc-900">{title}</h3>
        <p className="mb-4 text-[14px] text-zinc-500">
          Например: «Квартира», «Дача», «Щиток на кухне»
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Название щитка"
          className="mb-4 h-14 w-full rounded-[20px] border border-black/8 bg-zinc-50 px-4 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
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

export function SchemeScreen({
  title = "Щиток",
  photoDataUrl,
  askNameOnBack = false,
  sharedPreview = false,
  onSaveShared,
  onBack,
  onRename,
  onShare,
  onDelete,
  onAssignCircuit,
  onUpdateDeviceCharacteristic,
  onToggleDevicePower,
  onAssessSafety,
  onCallMaster,
  devices: devicesProp,
  safetyScore: safetyProp,
  phases,
  powerKw,
  railCount,
}: {
  title?: string;
  photoDataUrl?: string | null;
  askNameOnBack?: boolean;
  sharedPreview?: boolean;
  onSaveShared?: () => void;
  onBack: () => void;
  onRename: (name: string) => void;
  onShare?: () => Promise<string>;
  onDelete: () => void;
  onAssignCircuit?: (deviceId: number, label: string) => void;
  onUpdateDeviceCharacteristic?: (
    deviceId: number,
    key: string,
    value: string,
  ) => void;
  onToggleDevicePower?: (deviceId: number) => void;
  onAssessSafety?: (payload: {
    phases: "1" | "3";
    powerKw: string;
    safety: number;
  }) => void;
  onCallMaster?: () => void;
  devices?: Device[];
  safetyScore?: number | null;
  phases?: "1" | "3";
  powerKw?: string;
  railCount?: number;
}) {
  const devices =
    devicesProp && devicesProp.length > 0 ? devicesProp : mockDevices;
  const safetyKnown =
    Boolean(phases && powerKw?.trim()) && typeof safetyProp === "number";
  const safetyScore = safetyKnown ? safetyProp : null;
  const networkParamsFilled = Boolean(phases && powerKw?.trim());

  const [tab, setTab] = useState<"scheme" | "photo">("scheme");
  const [sheetAnchorY, setSheetAnchorY] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [nameOnBackOpen, setNameOnBackOpen] = useState(false);
  const [saveSharedOpen, setSaveSharedOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyAssessing, setSafetyAssessing] = useState(false);
  const [safetyProgress, setSafetyProgress] = useState(0);
  const [safetyHintOpen, setSafetyHintOpen] = useState(false);
  const safetyFrameRef = useRef<number | null>(null);
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
    if (sharedPreview) {
      setSaveSharedOpen(true);
      return;
    }
    if (askNameOnBack) {
      setNameOnBackOpen(true);
      return;
    }
    onBack();
  };

  const runSafetyAssessment = ({
    nextPhases,
    nextPower,
  }: {
    nextPhases: "1" | "3";
    nextPower: string;
  }) => {
    const powerNum = Number(nextPower.replace(",", "."));
    const safety = computePanelSafetyScore(
      allRailDevices,
      nextPhases,
      powerNum,
    );
    setSafetyOpen(false);
    setSafetyAssessing(true);
    setSafetyProgress(0);

    const totalMs = 2400;
    const start = performance.now();
    if (safetyFrameRef.current != null) {
      cancelAnimationFrame(safetyFrameRef.current);
    }
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / totalMs);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setSafetyProgress(Math.round(eased * 100));
      if (t < 1) {
        safetyFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      safetyFrameRef.current = null;
      onAssessSafety?.({
        phases: nextPhases,
        powerKw: nextPower,
        safety,
      });
      setSafetyAssessing(false);
      setSafetyProgress(0);
    };
    safetyFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (safetyFrameRef.current != null) {
        cancelAnimationFrame(safetyFrameRef.current);
      }
    };
  }, []);

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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="max-w-[55%] truncate text-center text-[20px] font-semibold text-zinc-900">
          {title}
        </h1>
        {sharedPreview ? (
          <div className="h-11 w-11" />
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-zinc-100 text-zinc-900"
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
                  className="absolute right-0 top-12 z-30 min-w-[180px] overflow-hidden rounded-[18px] border border-black/8 bg-white shadow-2xl backdrop-blur-xl"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-zinc-900 hover:bg-zinc-50"
                    onClick={() => {
                      setMenuOpen(false);
                      void (async () => {
                        const url = await onShare?.();
                        if (url) setShareUrl(url);
                      })();
                    }}
                  >
                    <IosShareIcon className="h-4 w-4 text-zinc-600" />
                    Поделиться
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-zinc-900 hover:bg-zinc-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setRenameOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-zinc-600" />
                    Переименовать
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] text-rose-600 hover:bg-zinc-50"
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
        )}
      </header>

      <div className="mb-3 flex items-center gap-2 px-5">
        <button
          type="button"
          onClick={() => setTab("scheme")}
          className={cn(
            "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
            tab === "scheme"
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700",
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
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700",
          )}
        >
          Фото
        </button>
      </div>

      {tab === "scheme" ? (
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="overflow-x-auto">
            <GlassCard className="p-4" style={{ minWidth: railMinWidth }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-medium text-zinc-500">
                {numRails > 1 ? `${numRails} DIN-рейки` : "DIN-рейка"}
              </span>
              <span className="text-[12px] text-zinc-400">
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
                      <span className="text-[11px] font-medium text-zinc-400">
                        Ряд {railIdx + 1}
                      </span>
                      <span className="text-[11px] text-zinc-400">
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
                        onSelect={(clientY) => {
                          setSheetAnchorY(clientY);
                          setSelectedId(device.id);
                        }}
                        onTogglePower={onToggleDevicePower}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </GlassCard>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Определён ({verified})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Требует проверки ({pending})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
              Не определён ({unknown})
            </span>
          </div>

          <PanelDeviceGuideSection
            devices={allRailDevices}
            onCallMaster={onCallMaster}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <GlassCard className="overflow-hidden p-0">
            {photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt="Фото щитка"
                className="max-h-[60vh] w-full object-contain bg-zinc-100"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 text-zinc-400">
                <ImageIcon className="h-10 w-10" />
                <p className="text-[14px]">Фото щитка недоступно</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      <div className="border-t border-black/[0.06] bg-white/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="flex flex-col p-4">
            <div className="mb-2 text-[12px] text-zinc-500">Параметры сети</div>
            {networkParamsFilled ? (
              <>
                <div className="text-[15px] font-semibold leading-snug text-zinc-900">
                  {phases === "3" ? "3 фазы" : "1 фаза"}
                  <span className="text-zinc-400"> · </span>
                  {powerKw?.replace(".", ",")} кВт
                </div>
                <button
                  type="button"
                  onClick={() => setSafetyOpen(true)}
                  className="mt-auto pt-2 text-left text-[12px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800"
                >
                  Изменить
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] leading-snug text-zinc-400">
                  Укажите число фаз и выделенную мощность
                </p>
                <button
                  type="button"
                  onClick={() => setSafetyOpen(true)}
                  className="mt-auto pt-2 text-left text-[12px] font-semibold text-zinc-700"
                >
                  Указать параметры
                </button>
              </>
            )}
          </GlassCard>
          <GlassCard className="p-4">
            <div className="mb-1 flex items-center justify-between gap-2 text-[12px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-zinc-400" />
                Уровень безопасности
              </span>
              <HintInfoButton
                label="Как считается уровень безопасности"
                open={safetyHintOpen}
                onToggle={() => setSafetyHintOpen((v) => !v)}
              />
            </div>
            {safetyKnown && typeof safetyScore === "number" ? (
              <>
                <div className="flex items-end gap-2">
                  <span
                    className={cn(
                      "text-[28px] font-bold tabular-nums",
                      safetyTextColor(safetyScore),
                    )}
                  >
                    {safetyScore}%
                  </span>
                  <span className="mb-1.5 text-[12px] text-zinc-500">
                    {safetyLabel(safetyScore)}
                  </span>
                </div>
                <Progress
                  value={safetyScore}
                  className="mt-2 h-1.5"
                  indicatorClassName={safetyIndicatorColor(safetyScore)}
                />
              </>
            ) : (
              <>
                <div className="text-[22px] font-bold text-zinc-400">Неизвестен</div>
                <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                  {networkParamsFilled
                    ? "Сохраните параметры сети для расчёта"
                    : "Сначала укажите параметры сети слева"}
                </p>
              </>
            )}
            {safetyHintOpen && (
              <p className="mt-2.5 border-t border-black/[0.06] pt-2.5 text-[11px] leading-relaxed text-zinc-500">
                {safetyScoreDisclaimer}
              </p>
            )}
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {selected && tab === "scheme" && (
          <DeviceSheet
            device={selected}
            anchorY={sheetAnchorY}
            specEditable={!sharedPreview}
            onClose={() => {
              setSelectedId(null);
              setSheetAnchorY(null);
            }}
            onAssignCircuit={(deviceId, circuitLabel) => {
              onAssignCircuit?.(deviceId, circuitLabel);
            }}
            onUpdateCharacteristic={
              sharedPreview ? undefined : onUpdateDeviceCharacteristic
            }
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
        {shareUrl && (
          <ShareSheet url={shareUrl} onClose={() => setShareUrl(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saveSharedOpen && (
          <ConfirmDialog
            title="Сохранить щиток?"
            description="Щиток появится в вашем списке на главной. Можно открыть его позже."
            confirmLabel="Сохранить"
            cancelLabel="Не сохранять"
            danger={false}
            onCancel={() => {
              setSaveSharedOpen(false);
              onBack();
            }}
            onConfirm={() => {
              setSaveSharedOpen(false);
              onSaveShared?.();
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

      <AnimatePresence>
        {safetyOpen && (
          <SafetyParamsSheet
            initialPhases={phases}
            initialPowerKw={powerKw}
            onCancel={() => setSafetyOpen(false)}
            onConfirm={({ phases: nextPhases, powerKw: nextPower }) => {
              runSafetyAssessment({
                nextPhases,
                nextPower,
              });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {safetyAssessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 px-8 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-[24px] border border-black/8 bg-white p-5 shadow-xl">
              <div className="mb-1 text-[16px] font-semibold text-zinc-900">
                Считаем уровень безопасности
              </div>
              <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
                Сверяем состав приборов с фазами и выделенной мощностью…
              </p>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${safetyProgress}%` }}
                  transition={{ ease: "linear", duration: 0.08 }}
                />
              </div>
              <div className="text-right text-[12px] tabular-nums text-zinc-400">
                {safetyProgress}%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
