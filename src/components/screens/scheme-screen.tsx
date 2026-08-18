"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronRight,
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
import {
  findTerminalAtPoint,
  PanelWiresSvg,
} from "@/components/scheme/panel-wires-svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShareSheet } from "@/components/ui/share-sheet";
import { Progress } from "@/components/ui/progress";
import { SafetyParamsSheet } from "@/components/ui/safety-params-sheet";
import { SafetyExplainSheet } from "@/components/ui/safety-explain-sheet";
import { EditableSpecCard } from "@/components/ui/editable-spec-card";
import { WireSpecSheet } from "@/components/ui/wire-spec-sheet";
import { Portal } from "@/components/ui/portal";
import { circuitIdentifySteps } from "@/lib/device-catalog";
import { deviceTypeGuide } from "@/lib/panel-device-guide";
import {
  manualSpecEditDisclaimer,
} from "@/lib/device-spec-guide";
import {
  createWireId,
  sameTerminal,
  terminalKey,
  wireConnectsSamePair,
} from "@/lib/panel-wires";
import { hapticContextMenu, hapticImpact } from "@/lib/haptics";
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
  getManufacturerBrand,
  isDeviceDetailsConfident,
  MANUFACTURER_BRANDS,
} from "@/lib/manufacturer-brands";
import { cn } from "@/lib/utils";
import type { Device, DeviceType, PanelWire, TerminalRef } from "@/types";

const TERMINAL_HOLD_MS = 320;

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
  showTerminals,
  highlightTerminalKey,
  onSelect,
  onTerminalPointerDown,
}: {
  device: Device;
  selected: boolean;
  showTerminals: boolean;
  highlightTerminalKey?: string | null;
  onSelect: (clientY: number) => void;
  onTerminalPointerDown?: (
    terminal: { deviceId: number; side: "top" | "bottom"; index: number },
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  const modules = deviceModules(device);
  const width = modules * MODULE_PX;
  const confident = isDeviceDetailsConfident(device);

  return (
    <div className="flex flex-col items-stretch" style={{ width, flex: "none" }}>
      <span
        className={cn(
          "mb-1 line-clamp-1 min-h-[14px] text-left text-[10px] font-medium leading-tight",
          confident ? "text-zinc-500" : "text-transparent",
        )}
      >
        {confident ? typeShort[device.type] : "·"}
      </span>
      <DeviceFace
        device={device}
        modules={modules}
        selected={selected}
        showTerminals={showTerminals}
        interactiveTerminals={showTerminals}
        highlightTerminalKey={highlightTerminalKey}
        showDetails={confident}
        onSelect={(event) => onSelect(event.clientY)}
        onTerminalPointerDown={onTerminalPointerDown}
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

const ROOM_OPTIONS = [
  "Кухня", "Коридор", "Ванная", "Туалет", "Спальня",
  "Гостиная", "Детская", "Балкон", "Прихожая",
] as const;

const LOAD_OPTIONS = [
  "Розетки", "Свет", "Плита", "Стиральная машина",
  "Бойлер", "Кондиционер", "Тёплый пол",
] as const;

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
  const [questStep, setQuestStep] = useState(0);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  const [iKnow, setIKnow] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const confident = isDeviceDetailsConfident(device);
  const manufacturerValue =
    getManufacturerBrand(device.brandKey, device.manufacturer)?.label ??
    device.manufacturer?.trim() ??
    "—";
  const typeValue =
    DEVICE_TYPE_OPTIONS.find((item) => item.type === device.type)?.label ??
    typeShort[device.type];
  const identitySpecs = useMemo(
    () =>
      [
        ["Производитель", manufacturerValue],
        ["Тип", typeValue],
        ["Номинал", device.rating?.trim() || "—"],
      ] as Array<[string, string]>,
    [device.rating, manufacturerValue, typeValue],
  );
  const specs = useMemo(() => {
    if (!confident) return [] as Array<[string, string]>;
    const hidden = new Set(["Производитель", "Модель", "Тип", "Номинал"]);
    const fromCatalog = Object.entries(device.characteristics ?? {}).filter(
      ([key]) => !hidden.has(key),
    );
    if (fromCatalog.length > 0) return fromCatalog;
    return [
      ["Модули", String(deviceModules(device))],
    ] as Array<[string, string]>;
  }, [confident, device]);

  const handleSpecChange = (key: string, next: string) => {
    if (key === "Производитель") {
      const brand = MANUFACTURER_BRANDS.find((item) => item.label === next);
      onUpdateIdentity?.(device.id, {
        manufacturer: brand?.label ?? next,
        brandKey: brand?.key,
      });
      return;
    }
    if (key === "Тип") {
      const option = DEVICE_TYPE_OPTIONS.find((item) => item.label === next);
      if (option) onUpdateIdentity?.(device.id, { type: option.type });
      return;
    }
    onUpdateCharacteristic?.(device.id, key, next);
  };

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
    <Portal>
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
              <p className="mt-1 text-[14px] leading-relaxed text-zinc-500">
                Укажите производителя, тип и номинал ниже. Статус на схеме
                меняется цветовой полоской под прибором.
              </p>
            )}
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

        {specEditable && (
          <div className="mb-5 grid grid-cols-2 gap-3">
            {identitySpecs.map(([key, value]) => (
              <EditableSpecCard
                key={key}
                deviceType={device.type}
                label={key}
                value={value}
                editable={Boolean(
                  onUpdateIdentity || onUpdateCharacteristic,
                )}
                onChange={
                  onUpdateIdentity || onUpdateCharacteristic
                    ? (next) => handleSpecChange(key, next)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {specEditable && onUpdateCharacteristic && confident && (
          <p className="mb-3 text-[12px] leading-relaxed text-amber-800/90">
            {manualSpecEditDisclaimer}
          </p>
        )}

        {confident && specs.length > 0 && (
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
            🔍 Квест: определи линию прибора
          </div>

          {/* Quest steps */}
          <ol className="space-y-2">
            {circuitIdentifySteps.map((step, index) => {
              const done = index < questStep;
              const active = index === questStep;
              return (
                <li key={step} className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (active) setQuestStep(index + 1);
                      else if (done) setQuestStep(index);
                    }}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-400",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </button>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-[13px] leading-relaxed",
                        done
                          ? "text-zinc-400 line-through"
                          : active
                            ? "font-medium text-zinc-900"
                            : "text-zinc-400",
                      )}
                    >
                      {step}
                    </span>
                    {active && (
                      <button
                        type="button"
                        onClick={() => setQuestStep(index + 1)}
                        className="mt-1 flex items-center gap-1 text-[12px] font-medium text-zinc-600"
                      >
                        Готово <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {questStep >= circuitIdentifySteps.length && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 rounded-[16px] bg-emerald-50 p-3"
            >
              <p className="text-[13px] font-medium text-emerald-800">
                Отлично! Теперь выберите помещение и нагрузку:
              </p>
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-zinc-500">Помещение</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROOM_OPTIONS.map((room) => {
                    const active = selectedRooms.includes(room);
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() =>
                          setSelectedRooms((prev) =>
                            active ? prev.filter((r) => r !== room) : [...prev, room],
                          )
                        }
                        className={cn(
                          "rounded-full px-3 py-1 text-[13px] transition-colors",
                          active
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-600",
                        )}
                      >
                        {room}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-zinc-500">Нагрузка</p>
                <div className="flex flex-wrap gap-1.5">
                  {LOAD_OPTIONS.map((load) => {
                    const active = selectedLoads.includes(load);
                    return (
                      <button
                        key={load}
                        type="button"
                        onClick={() =>
                          setSelectedLoads((prev) =>
                            active ? prev.filter((l) => l !== load) : [...prev, load],
                          )
                        }
                        className={cn(
                          "rounded-full px-3 py-1 text-[13px] transition-colors",
                          active
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-600",
                        )}
                      >
                        {load}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(selectedRooms.length > 0 || selectedLoads.length > 0) && (
                <Button
                  className="w-full"
                  onClick={() => {
                    const parts = [...selectedRooms, ...selectedLoads];
                    const built = parts.join(" · ");
                    setLabel(built);
                    onAssignCircuit(device.id, built);
                  }}
                >
                  Сохранить: {[...selectedRooms, ...selectedLoads].join(" · ")}
                </Button>
              )}
            </motion.div>
          )}

          {/* "I know" checkbox */}
          <div className="border-t border-black/5 pt-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  iKnow
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white",
                )}
                onClick={() => setIKnow((v) => !v)}
              >
                {iKnow && <Check className="h-3.5 w-3.5" />}
              </span>
              <span
                className="text-[14px] text-zinc-700"
                onClick={() => setIKnow((v) => !v)}
              >
                Знаю, за что отвечает прибор
              </span>
            </label>
            {iKnow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Например: Кухня розетки"
                  className="h-12 w-full rounded-[16px] border border-black/8 bg-zinc-50 px-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                />
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={!customLabel.trim()}
                  onClick={() => {
                    setLabel(customLabel.trim());
                    onAssignCircuit(device.id, customLabel.trim());
                  }}
                >
                  Сохранить название линии
                </Button>
              </motion.div>
            )}
          </div>
        </GlassCard>

        <Button className="w-full" onClick={onClose}>
          <BreakerIcon className="h-4 w-4" />
          Закрыть
        </Button>
      </motion.div>
    </motion.div>
    </Portal>
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
  onUpdateWires,
  onAssessSafety,
  onCallMaster,
  devices: devicesProp,
  wires: wiresProp,
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
  onUpdateWires?: (wires: PanelWire[]) => void;
  onAssessSafety?: (payload: {
    phases: "1" | "3";
    powerKw: string;
    hasGround: boolean;
    safety: number;
  }) => void;
  onCallMaster?: () => void;
  devices?: Device[];
  wires?: PanelWire[];
  safetyScore?: number | null;
  phases?: "1" | "3";
  powerKw?: string;
  hasGround?: boolean;
  railCount?: number;
}) {
  const devices = devicesProp ?? [];
  const wires = wiresProp ?? [];
  const safetyKnown =
    Boolean(phases && powerKw?.trim()) && typeof safetyProp === "number";
  const safetyScore = safetyKnown ? safetyProp : null;
  const networkParamsFilled = Boolean(phases && powerKw?.trim());

  const [tab, setTab] = useState<"scheme" | "photo">("scheme");
  const [showTerminals, setShowTerminals] = useState(false);
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
  const [wireDraft, setWireDraft] = useState<{
    from: TerminalRef;
    x: number;
    y: number;
  } | null>(null);
  const [pendingWire, setPendingWire] = useState<{
    from: TerminalRef;
    to: TerminalRef;
    existing?: PanelWire;
  } | null>(null);
  const [editingWire, setEditingWire] = useState<PanelWire | null>(null);
  const [wiresLayoutTick, setWiresLayoutTick] = useState(0);
  const safetyFrameRef = useRef<number | null>(null);
  const schemeCanvasRef = useRef<HTMLDivElement | null>(null);
  const [schemeCanvasEl, setSchemeCanvasEl] = useState<HTMLDivElement | null>(
    null,
  );
  const wiringHoldRef = useRef<{
    from: TerminalRef;
    timer: number;
    pointerId: number;
    started: boolean;
    hoverKey: string | null;
  } | null>(null);
  const [hoverTerminalKey, setHoverTerminalKey] = useState<string | null>(null);
  const selected = devices.find((d) => d.id === selectedId) ?? null;

  const allRailDevices = useMemo(
    () =>
      devices.filter((d) => d.type !== "pe_bus" && d.type !== "n_bus"),
    [devices],
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
  const numRails =
    railCount ??
    Math.max(
      1,
      ...allRailDevices.map((d) => (d.rail ?? 0) + 1),
      1,
    );
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

  useEffect(() => {
    if (!showTerminals) return;
    const id = window.requestAnimationFrame(() => {
      setWiresLayoutTick((v) => v + 1);
    });
    return () => window.cancelAnimationFrame(id);
  }, [showTerminals, wires.length, devices, numRails]);

  useEffect(() => {
    const onResize = () => setWiresLayoutTick((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setSchemeCanvasRef = useCallback((el: HTMLDivElement | null) => {
    schemeCanvasRef.current = el;
    setSchemeCanvasEl((prev) => (prev === el ? prev : el));
  }, []);

  const wiringPointRef = useRef({ x: 0, y: 0 });

  const clearWiringHold = () => {
    const hold = wiringHoldRef.current;
    if (hold) {
      window.clearTimeout(hold.timer);
      wiringHoldRef.current = null;
    }
  };

  const handleTerminalPointerDown = (
    terminal: TerminalRef,
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    if (sharedPreview || !onUpdateWires || !showTerminals) return;
    if (event.button !== 0) return;
    event.preventDefault();
    clearWiringHold();
    setHoverTerminalKey(null);
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);
    wiringPointRef.current = { x: event.clientX, y: event.clientY };
    const fromKey = terminalKey(terminal);

    const timer = window.setTimeout(() => {
      const hold = wiringHoldRef.current;
      if (!hold || hold.pointerId !== pointerId) return;
      hold.started = true;
      hapticContextMenu();
      setWireDraft({
        from: terminal,
        x: wiringPointRef.current.x,
        y: wiringPointRef.current.y,
      });
    }, TERMINAL_HOLD_MS);

    wiringHoldRef.current = {
      from: terminal,
      timer,
      pointerId,
      started: false,
      hoverKey: fromKey,
    };

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      wiringPointRef.current = {
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      };
      const hold = wiringHoldRef.current;
      if (!hold) return;
      if (hold.started) {
        setWireDraft({
          from: hold.from,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        });

        const over = findTerminalAtPoint(moveEvent.clientX, moveEvent.clientY);
        const overKey = over ? terminalKey(over) : null;
        if (overKey !== hold.hoverKey) {
          hold.hoverKey = overKey;
          setHoverTerminalKey(
            overKey && overKey !== fromKey ? overKey : null,
          );
          if (overKey && overKey !== fromKey) {
            hapticImpact("light");
          }
        }
      }
    };

    const finish = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // already released
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);

      const hold = wiringHoldRef.current;
      clearWiringHold();
      setWireDraft(null);
      setHoverTerminalKey(null);
      if (!hold?.started) return;

      const to = findTerminalAtPoint(upEvent.clientX, upEvent.clientY);
      if (!to || sameTerminal(hold.from, to)) return;

      const existing = wires.find((wire) =>
        wireConnectsSamePair(wire, hold.from, to),
      );
      hapticImpact("medium");
      setPendingWire({ from: hold.from, to, existing });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const commitWire = (spec: { color: string; thicknessMm: number }) => {
    if (!onUpdateWires) return;
    if (editingWire) {
      onUpdateWires(
        wires.map((wire) =>
          wire.id === editingWire.id
            ? { ...wire, color: spec.color, thicknessMm: spec.thicknessMm }
            : wire,
        ),
      );
      setEditingWire(null);
      return;
    }
    if (!pendingWire) return;
    const nextWire: PanelWire = {
      id: pendingWire.existing?.id ?? createWireId(),
      from: pendingWire.from,
      to: pendingWire.to,
      color: spec.color,
      thicknessMm: spec.thicknessMm,
    };
    const without = wires.filter(
      (wire) => !wireConnectsSamePair(wire, pendingWire.from, pendingWire.to),
    );
    onUpdateWires([...without, nextWire]);
    setPendingWire(null);
  };

  const deleteWire = () => {
    if (!onUpdateWires) return;
    if (editingWire) {
      onUpdateWires(wires.filter((wire) => wire.id !== editingWire.id));
      setEditingWire(null);
      return;
    }
    if (pendingWire?.existing) {
      onUpdateWires(
        wires.filter((wire) => wire.id !== pendingWire.existing?.id),
      );
      setPendingWire(null);
    }
  };
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto lg:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6 lg:px-10">
      {tab === "scheme" ? (
        <div className="px-5 pb-4 lg:min-w-0 lg:flex-1 lg:px-0">
          <div className={cn("overflow-x-auto", showTerminals && "overflow-y-visible")}>
            <GlassCard
              className={cn("p-4", showTerminals && "overflow-visible")}
              style={{ minWidth: railMinWidth }}
            >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-medium text-zinc-500">
                {numRails > 1 ? `${numRails} DIN-рейки` : "DIN-рейка"}
              </span>
              <span className="text-[12px] text-zinc-400">
                {allRailDevices.length} приборов
              </span>
            </div>

            <div
              ref={setSchemeCanvasRef}
              className={cn("relative", showTerminals && "py-11")}
            >              {showTerminals && (
                <PanelWiresSvg
                  key={wiresLayoutTick}
                  container={schemeCanvasEl}
                  wires={wires}
                  draft={wireDraft}
                  onWireClick={
                    sharedPreview || !onUpdateWires
                      ? undefined
                      : (wire) => setEditingWire(wire)
                  }
                />
              )}
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
                          showTerminals={showTerminals}
                          highlightTerminalKey={
                            hoverTerminalKey ??
                            (wireDraft ? terminalKey(wireDraft.from) : null)
                          }
                          onSelect={(clientY) => {
                            if (wireDraft) return;
                            setSheetAnchorY(clientY);
                            setSelectedId(device.id);
                          }}
                          onTerminalPointerDown={
                            sharedPreview ? undefined : handleTerminalPointerDown
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
          </div>

          {(pending > 0 || unknown > 0) && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-zinc-500">
              {verified > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Определён ({verified})
                </span>
              )}
              {pending > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Требует проверки ({pending})
                </span>
              )}
              {unknown > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                  Не определён ({unknown})
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStickerOpen(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-black/8 bg-white px-4 py-3 text-[14px] font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <StickerBadgeIcon className="h-4 w-4 text-zinc-600" />
            Стикеры в щиток
          </button>

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
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 px-6 text-zinc-400">
                <ImageIcon className="h-10 w-10" />
                <p className="max-w-[280px] text-center text-[14px] leading-relaxed text-zinc-500">
                  Фотография щитка доступна только на том устройстве, с которого
                  была сделана или загружена фотография.
                </p>
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
        {(pendingWire || editingWire) && (
          <WireSpecSheet
            initialColor={
              editingWire?.color ??
              pendingWire?.existing?.color ??
              "#92400E"
            }
            initialThicknessMm={
              editingWire?.thicknessMm ??
              pendingWire?.existing?.thicknessMm ??
              2.5
            }
            allowDelete={Boolean(editingWire || pendingWire?.existing)}
            onConfirm={commitWire}
            onDelete={deleteWire}
            onCancel={() => {
              setPendingWire(null);
              setEditingWire(null);
            }}
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
