"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Gauge,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
  Zap,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/icons/brand-mark";
import { IosShareIcon } from "@/components/icons/ios-share-icon";
import { BreakerIcon } from "@/components/icons/breaker-icon";
import { StickerBadgeIcon } from "@/components/icons/sticker-badge";
import {
  GroundSymbol,
  SupplyCableIcon,
} from "@/components/icons/supply-cable";
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
import { SafetyParamsSheet } from "@/components/ui/safety-params-sheet";
import { SafetyExplainSheet } from "@/components/ui/safety-explain-sheet";
import { EditableSpecCard } from "@/components/ui/editable-spec-card";
import { circuitIdentifySteps } from "@/lib/device-catalog";
import { devices as mockDevices } from "@/lib/mock-data";
import { deviceTypeGuide } from "@/lib/panel-device-guide";
import {
  manualSpecEditDisclaimer,
} from "@/lib/device-spec-guide";
import {
  analyzePanelSafety,
  computePanelSafetyScore,
  safetyIndicatorColor,
  safetyLabel,
  safetyTextColor,
} from "@/lib/safety-score";
import { PanelDeviceGuideSection } from "@/components/screens/panel-device-guide-section";
import { StickerDesigner } from "@/components/screens/sticker-designer";
import {
  deviceModules,
  groupDevicesByRail,
  MAX_MODULES_PER_RAIL,
  truncateDevicesForRail,
} from "@/lib/panel-rails";
import {
  DEVICE_TYPE_OPTIONS,
  isDeviceDetailsConfident,
  MANUFACTURER_BRANDS,
  resolveBrandKey,
} from "@/lib/manufacturer-brands";
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
  const confident = isDeviceDetailsConfident(device);

  return (
    <div className="flex flex-col items-stretch" style={{ width, flex: "none" }}>
      <span
        className={cn(
          "mb-1 line-clamp-1 text-left text-[10px] font-medium leading-tight",
          confident ? "text-zinc-500" : "text-amber-700",
        )}
      >
        {confident ? typeShort[device.type] : "Уточнить"}
      </span>
      <DeviceFace
        device={device}
        modules={modules}
        selected={selected}
        showTerminals={false}
        showDetails={confident}
        onSelect={(event) => onSelect(event.clientY)}
        onLongPress={() => onTogglePower?.(device.id)}
        brand={
          confident ? (
            <BrandMark brandKey={device.brandKey} brand={device.manufacturer} />
          ) : undefined
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
  onUpdateIdentity,
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
  onUpdateIdentity?: (
    deviceId: number,
    patch: {
      type?: DeviceType;
      manufacturer?: string;
      brandKey?: string;
    },
  ) => void;
  specEditable?: boolean;
}) {
  const [label, setLabel] = useState(device.circuitLabel ?? "");
  const [sheetTop, setSheetTop] = useState(() => computeSheetTop(anchorY));
  const confident = isDeviceDetailsConfident(device);
  const specs = useMemo(() => {
    if (!confident) return [] as Array<[string, string]>;
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
  }, [confident, device]);

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
                {confident ? deviceTitle(device) : "Прибор требует уточнения"}
              </h3>
              <Badge status={device.status} />
            </div>
            {confident ? (
              <p className="text-[14px] text-zinc-500">{device.rating}</p>
            ) : (
              <p className="text-[14px] leading-relaxed text-amber-800/90">
                ИИ не уверен в типе, производителе и характеристиках. Укажите их
                ниже — на схеме появятся логотип и подписи.
              </p>
            )}
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

        {specEditable && onUpdateIdentity && (
          <GlassCard className="mb-5 space-y-4 p-4">
            <div>
              <div className="mb-2 text-[13px] font-semibold text-zinc-900">
                Производитель
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {MANUFACTURER_BRANDS.map((brand) => {
                  const active =
                    resolveBrandKey(device.brandKey, device.manufacturer) ===
                    brand.key;
                  return (
                    <button
                      key={brand.key}
                      type="button"
                      onClick={() =>
                        onUpdateIdentity(device.id, {
                          brandKey: brand.key,
                          manufacturer: brand.label,
                        })
                      }
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-[14px] border px-2 py-2.5 transition-colors",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-black/8 bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-full items-center justify-center rounded-md",
                          active ? "bg-white/10" : "bg-white",
                        )}
                      >
                        <BrandMark brandKey={brand.key} brand={brand.label} />
                      </span>
                      <span className="line-clamp-1 text-[10px] font-medium">
                        {brand.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-zinc-900">
                Тип прибора
              </div>
              <div className="flex flex-wrap gap-2">
                {DEVICE_TYPE_OPTIONS.map((item) => {
                  const active = device.type === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() =>
                        onUpdateIdentity(device.id, { type: item.type })
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        active
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        )}

        {specEditable && onUpdateCharacteristic && confident && (
          <p className="mb-3 text-[12px] leading-relaxed text-amber-800/90">
            {manualSpecEditDisclaimer}
          </p>
        )}

        {confident && (
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
        )}

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
  onUpdateDeviceIdentity,
  onUpdateDeviceSticker,
  onToggleDevicePower,
  onAssessSafety,
  onCallMaster,
  devices: devicesProp,
  safetyScore: safetyProp,
  phases,
  powerKw,
  hasGround,
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
  onUpdateDeviceIdentity?: (
    deviceId: number,
    patch: {
      type?: DeviceType;
      manufacturer?: string;
      brandKey?: string;
    },
  ) => void;
  onUpdateDeviceSticker?: (
    deviceId: number,
    patch: { circuitLabel?: string; stickerIcon?: string },
  ) => void;
  onToggleDevicePower?: (deviceId: number) => void;
  onAssessSafety?: (payload: {
    phases: "1" | "3";
    powerKw: string;
    hasGround: boolean;
    safety: number;
  }) => void;
  onCallMaster?: () => void;
  devices?: Device[];
  safetyScore?: number | null;
  phases?: "1" | "3";
  powerKw?: string;
  hasGround?: boolean;
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
  const [safetyExplainOpen, setSafetyExplainOpen] = useState(false);
  const [safetyAssessing, setSafetyAssessing] = useState(false);
  const [safetyProgress, setSafetyProgress] = useState(0);
  const [stickerOpen, setStickerOpen] = useState(false);
  const safetyFrameRef = useRef<number | null>(null);
  const selected = devices.find((d) => d.id === selectedId) ?? null;

  const allRailDevices = devices.filter(
    (d) => d.type !== "pe_bus" && d.type !== "n_bus",
  );
  const safetyAdvice = useMemo(() => {
    const powerNum = Number((powerKw ?? "").replace(",", "."));
    return analyzePanelSafety(
      allRailDevices,
      phases,
      Number.isFinite(powerNum) && powerNum > 0 ? powerNum : undefined,
      hasGround,
    ).advice;
  }, [allRailDevices, phases, powerKw, hasGround]);

  // Group devices by rail
  const numRails = railCount ?? Math.max(1, ...allRailDevices.map((d) => (d.rail ?? 0) + 1));
  const rails = useMemo(
    () => groupDevicesByRail(allRailDevices, numRails),
    [allRailDevices, numRails],
  );
  const railDisplay = useMemo(
    () =>
      rails.map((railDevices) => ({
        ...truncateDevicesForRail(railDevices),
        all: railDevices,
      })),
    [rails],
  );
  const verified = devices.filter((d) => d.status === "verified").length;
  const pending = devices.filter((d) => d.status === "pending").length;
  const unknown = devices.filter((d) => d.status === "unknown").length;
  const widestRailModules = Math.max(
    ...railDisplay.map((rail) =>
      rail.visible.reduce((sum, device) => sum + deviceModules(device), 0),
    ),
    1,
  );
  const widestRailDevices = Math.max(...railDisplay.map((rail) => rail.visible.length));
  const railMinWidth = Math.max(
    320,
    Math.min(widestRailModules, MAX_MODULES_PER_RAIL) * MODULE_PX +
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
    nextHasGround,
  }: {
    nextPhases: "1" | "3";
    nextPower: string;
    nextHasGround: boolean;
  }) => {
    const powerNum = Number(nextPower.replace(",", "."));
    const safety = computePanelSafetyScore(
      allRailDevices,
      nextPhases,
      powerNum,
      nextHasGround,
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
        hasGround: nextHasGround,
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

  const networkSafetyCards = (
    <>
      <button
        type="button"
        onClick={() => {
          if (sharedPreview) return;
          setSafetyOpen(true);
        }}
        className="min-w-0 text-left transition-transform active:scale-[0.99] lg:cursor-pointer"
      >
        <GlassCard className="flex h-full flex-col p-4 lg:p-5">
          <div className="mb-2 text-[12px] text-zinc-500">Параметры сети</div>
          {networkParamsFilled ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-tight text-zinc-900">
                  {phases === "3" ? "3 фазы" : "1 фаза"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="text-[14px] font-semibold leading-tight text-zinc-900">
                  {powerKw?.replace(".", ",")} кВт
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GroundSymbol className="h-4 w-4 text-zinc-400" />
                <span className="text-[14px] font-semibold leading-tight text-zinc-900">
                  {hasGround === true
                    ? "Есть земля"
                    : hasGround === false
                      ? "Нет земли"
                      : "Земля не указана"}
                </span>
              </div>
              <div className="flex justify-center pt-3">
                <SupplyCableIcon
                  phases={phases === "3" ? "3" : "1"}
                  hasGround={hasGround === true}
                  className="scale-125"
                />
              </div>
            </div>
          ) : (
            <p className="text-[13px] leading-snug text-zinc-400">
              Нажмите, чтобы указать число фаз, мощность и наличие земли
            </p>
          )}
        </GlassCard>
      </button>
      <button
        type="button"
        onClick={() => setSafetyExplainOpen(true)}
        className="min-w-0 text-left transition-transform active:scale-[0.99] lg:cursor-pointer"
      >
        <GlassCard className="flex h-full flex-col p-4 lg:p-5">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] text-zinc-500">
            <Shield className="h-3.5 w-3.5 text-zinc-400" />
            Уровень безопасности
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
                  ? "Нажмите, чтобы узнать, как считается оценка"
                  : "Сначала укажите параметры сети"}
              </p>
            </>
          )}
        </GlassCard>
      </button>
    </>
  );

  return (
    <motion.section
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-[max(1.25rem,env(safe-area-inset-top))] lg:pt-6"
    >
      <header className="mb-4 flex items-center justify-between px-5 lg:px-10">
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
                      setStickerOpen(true);
                    }}
                  >
                    <StickerBadgeIcon className="h-4 w-4 text-zinc-600" />
                    Стикеры в щиток
                  </button>
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

      <div className="mb-3 flex items-center gap-2 px-5 lg:px-10">
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
        <button
          type="button"
          onClick={() => setStickerOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <StickerBadgeIcon className="h-3.5 w-3.5" />
          Стикеры в щиток
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto lg:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6 lg:px-10">
      {tab === "scheme" ? (
        <div className="px-5 pb-4 lg:min-w-0 lg:flex-1 lg:px-0">
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

            {railDisplay.map((rail, railIdx) => {
              const railModules = rail.totalModules;
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
                    {rail.visible.map((device) => (
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
        <div className="px-5 pb-4 lg:min-w-0 lg:flex-1 lg:px-0">
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

      <aside className="hidden w-[340px] shrink-0 flex-col gap-3 px-5 pb-4 lg:flex lg:px-0 lg:pb-0">
        {networkSafetyCards}
      </aside>
      </div>
      </div>

      <div className="border-t border-black/[0.06] bg-white/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-2 gap-3">{networkSafetyCards}</div>
      </div>

      <AnimatePresence>
        {stickerOpen && (
          <StickerDesigner
            rails={railDisplay.map((rail) => rail.visible)}
            panelTitle={title}
            editable={!sharedPreview}
            onClose={() => setStickerOpen(false)}
            onUpdate={sharedPreview ? undefined : onUpdateDeviceSticker}
          />
        )}
      </AnimatePresence>

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
            onUpdateIdentity={
              sharedPreview ? undefined : onUpdateDeviceIdentity
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
        {safetyExplainOpen && (
          <SafetyExplainSheet
            score={safetyScore}
            advice={safetyAdvice}
            onClose={() => setSafetyExplainOpen(false)}
            onEditParams={
              sharedPreview
                ? undefined
                : () => {
                    setSafetyExplainOpen(false);
                    setSafetyOpen(true);
                  }
            }
            onCallMaster={
              onCallMaster
                ? () => {
                    setSafetyExplainOpen(false);
                    onCallMaster();
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {safetyOpen && (
          <SafetyParamsSheet
            initialPhases={phases}
            initialPowerKw={powerKw}
            initialHasGround={hasGround}
            onCancel={() => setSafetyOpen(false)}
            onConfirm={({
              phases: nextPhases,
              powerKw: nextPower,
              hasGround: nextHasGround,
            }) => {
              runSafetyAssessment({
                nextPhases,
                nextPower,
                nextHasGround,
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
                Сверяем состав приборов с фазами, мощностью и заземлением…
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
