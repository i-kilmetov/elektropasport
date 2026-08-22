"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Gauge,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
  Zap,
  X,
} from "lucide-react";
import { DeviceFaceIdentityMark } from "@/components/icons/brand-mark";
import { IosShareIcon } from "@/components/icons/ios-share-icon";
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
import { SafetyParamsSheet } from "@/components/ui/safety-params-sheet";
import { SafetyExplainSheet } from "@/components/ui/safety-explain-sheet";
import { SafetyAxisMeters } from "@/components/ui/safety-axis-meters";
import { EditableSpecCard } from "@/components/ui/editable-spec-card";
import { InputBreakerDiagnosticsSheet } from "@/components/ui/input-breaker-diagnostics-sheet";
import {
  deviceCharacteristicRows,
  displaySpecValue,
} from "@/lib/device-characteristics";
import {
  panelHasConfirmedInputBreaker,
} from "@/lib/input-breaker-diagnostics";
import { WireSpecSheet } from "@/components/ui/wire-spec-sheet";
import { WaitlistSheet } from "@/components/ui/waitlist-sheet";
import { Portal } from "@/components/ui/portal";
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
} from "@/lib/safety-score";
import { PanelDeviceGuideSection } from "@/components/screens/panel-device-guide-section";
import { StickerDesigner } from "@/components/screens/sticker-designer";
import {
  deviceModules,
  groupDevicesByRail,
  railModuleTotal,
} from "@/lib/panel-rails";
import {
  DEVICE_TYPE_OPTIONS,
  getManufacturerBrand,
  isDeviceDetailsConfident,
  MANUFACTURER_BRANDS,
} from "@/lib/manufacturer-brands";
import {
  allPanelLoadsIdentified,
  collectOccupiedLoads,
  defaultDeviceCircuitLabel,
  deviceHasLineIdentification,
  deviceHasSpecifiedLineLoads,
  deviceNeedsLineIdentification,
  formatLineLoads,
  inferObjectTypeFromLabel,
  loadIdentifyContext,
  occupiedLoadKey,
  parseLineLoads,
  protectiveLabelHint,
  saveIdentifyContext,
  type IdentifyContext,
  type IdentifyObjectType,
} from "@/lib/panel-identify";
import { assessDeviceLineLoadSafety, assessLineLoadSafety } from "@/lib/line-load-safety";
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

function deviceWord(count: number): string {
  const n10 = count % 10;
  const n100 = count % 100;
  if (n10 === 1 && n100 !== 11) return "прибор";
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return "прибора";
  return "приборов";
}

function remainingDevicesPhrase(count: number): string {
  if (count === 1) return "Остался ещё 1 прибор.";
  return `Осталось ещё ${count} ${deviceWord(count)}.`;
}

function devicesDativePhrase(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} прибору`;
  return `${count} приборам`;
}

function DeviceBlock({
  device,
  selected,
  showTerminals,
  highlightTerminalKey,
  onSelect,
  onTerminalPointerDown,
  caption,
  loadMismatch = false,
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
  caption?: string;
  loadMismatch?: boolean;
}) {
  const modules = deviceModules(device);
  const width = modules * MODULE_PX;
  const confident = isDeviceDetailsConfident(device);
  const loadTone = loadMismatch
    ? "mismatch"
    : deviceHasSpecifiedLineLoads(device)
      ? "ok"
      : null;

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
      <div className="relative">
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
            confident && (device.manufacturer || device.brandKey) ? (
              <DeviceFaceIdentityMark
                brandKey={device.brandKey}
                brand={device.manufacturer}
                series={device.series}
              />
            ) : undefined
          }
        />
        {loadMismatch && (
          <span
            className="pointer-events-none absolute -right-1 -top-1 z-[6] flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
            title="Нагрузка не соответствует номиналу"
          >
            <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.75} />
          </span>
        )}
      </div>
      <DeviceStatusBar tone={loadTone} />
      {(device.circuitLabel?.trim() || caption?.trim()) && (
        <span
          className="mt-1 line-clamp-2 text-left text-[10px] font-medium leading-tight text-zinc-600"
        >
          {device.circuitLabel?.trim() || caption?.trim()}
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

const DEFAULT_ROOM_OPTIONS = [
  "Кухня",
  "Коридор",
  "Ванная",
  "Туалет",
  "Спальня",
  "Гостиная",
  "Детская",
  "Балкон",
  "Прихожая",
] as const;

const DEFAULT_LOAD_OPTIONS = [
  "Розетки",
  "Свет",
  "Плита",
  "Стиральная машина",
  "Бойлер",
  "Кондиционер",
  "Тёплый пол",
] as const;

const CORE_ROOM_LOAD_OPTIONS = ["Розетки", "Свет"] as const;

const OBJECT_TYPE_OPTIONS: Array<{ id: IdentifyObjectType; label: string }> = [
  { id: "apartment", label: "Квартира" },
  { id: "house", label: "Дом" },
  { id: "other", label: "Другое" },
];

const OBJECT_TYPE_CONFIG: Record<
  IdentifyObjectType,
  {
    wholeLabel: string;
    roomBase: string[];
    roomExtra: string[];
    equipmentBase: string[];
    equipmentExtra: string[];
  }
> = {
  apartment: {
    wholeLabel: "Вся квартира",
    roomBase: ["Кухня", "Коридор", "Ванная", "Туалет", "Гостиная"],
    roomExtra: [
      "Спальня",
      "Детская",
      "Балкон",
      "Кладовая",
      "Гардеробная",
      "Кабинет",
    ],
    equipmentBase: ["Стиральная машина", "Посудомоечная машина", "Бойлер"],
    equipmentExtra: [
      "Сушильная машина",
      "Плита",
      "Варочная панель",
      "Духовка",
      "Микроволновка",
      "Вытяжка",
      "Холодильник",
      "Морозильник",
      "Кондиционер",
      "Тёплый пол",
      "Водонагреватель",
      "Пылесос",
      "Утюг",
    ],
  },
  house: {
    wholeLabel: "Весь дом",
    roomBase: ["Кухня", "Коридор", "Гостиная", "Спальня", "Ванная"],
    roomExtra: [
      "Детская",
      "Котельная",
      "Мансарда",
      "Терраса",
      "Гараж",
      "Сарай",
      "Ворота",
      "Септик",
      "Насос",
    ],
    equipmentBase: ["Бойлер", "Стиральная машина", "Котёл"],
    equipmentExtra: [
      "Сушильная машина",
      "Посудомоечная машина",
      "Плита",
      "Варочная панель",
      "Духовка",
      "Микроволновка",
      "Вытяжка",
      "Холодильник",
      "Морозильник",
      "Кондиционер",
      "Тёплый пол",
      "Насос",
      "Септик",
      "Ворота",
      "Тепловой насос",
      "Газонокосилка",
      "Зарядка электромобиля",
    ],
  },
  other: {
    wholeLabel: "Весь объект",
    roomBase: ["Основное помещение", "Коридор", "Санузел"],
    roomExtra: ["Склад", "Подсобка", "Мастерская", "Улица"],
    equipmentBase: ["Вентиляция", "Кондиционер", "Освещение витрин"],
    equipmentExtra: [
      "Насос",
      "Котёл",
      "Ворота",
      "Охрана",
      "Компрессор",
      "Станки",
      "Сварка",
      "Холодильная камера",
      "Серверная",
    ],
  },
};

const identifyFlowSteps = [
  {
    text: "Убедитесь, что квартиру/дом можно кратковременно обесточить: бытовая техника и компьютеры не работают, в помещении светло (или есть фонарик)",
    action: "Подтверждаю",
  },
  {
    text: "Включите во всех комнатах свет, а в розетках любые заметные нагрузки (лампа, зарядка, радио и пр.)",
    action: "Включено",
  },
  {
    text: "Отключите только этот прибор на схеме (рычаг вниз).",
    action: "Рычаг опущен",
  },
] as const;

function IdentifyFlowFooter({
  onCancel,
  onCallMaster,
}: {
  onCancel: () => void;
  onCallMaster?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-600"
      >
        Отмена
      </button>
      <button
        type="button"
        onClick={onCallMaster}
        disabled={!onCallMaster}
        className="text-[13px] font-medium text-zinc-700 transition-colors hover:text-zinc-900 disabled:opacity-40"
      >
        ⚡ Помочь с электрикой
      </button>
    </div>
  );
}

function DeviceSheet({
  device,
  anchorY,
  onClose,
  onAssignCircuit,
  onUpdateCharacteristic,
  onUpdateIdentity,
  specEditable = true,
  knownObjectType = null,
  knownCatalogRooms = [],
  knownCatalogEquipment = [],
  panelDevices = [],
  onPersistIdentifyContext,
  onCallMaster,
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
  knownObjectType?: IdentifyObjectType | null;
  knownCatalogRooms?: string[];
  knownCatalogEquipment?: string[];
  panelDevices?: Device[];
  onPersistIdentifyContext?: (context: IdentifyContext) => void;
  onCallMaster?: () => void;
}) {
  const [sheetTop, setSheetTop] = useState(() => computeSheetTop(anchorY));
  const [flowStep, setFlowStep] = useState(0);
  const [objectType, setObjectType] = useState<IdentifyObjectType | null>(
    knownObjectType,
  );
  const [showMoreCatalogRooms, setShowMoreCatalogRooms] = useState(false);
  const [showMoreCatalogEquipment, setShowMoreCatalogEquipment] = useState(false);
  const [selectedCatalogRooms, setSelectedCatalogRooms] = useState<string[]>(
    knownCatalogRooms,
  );
  const [selectedCatalogEquipment, setSelectedCatalogEquipment] = useState<
    string[]
  >(knownCatalogEquipment);
  const [showCustomCatalogRoomInput, setShowCustomCatalogRoomInput] =
    useState(false);
  const [showCustomCatalogEquipmentInput, setShowCustomCatalogEquipmentInput] =
    useState(false);
  const [customCatalogRoom, setCustomCatalogRoom] = useState("");
  const [customCatalogEquipment, setCustomCatalogEquipment] = useState("");
  const [activeLineRoom, setActiveLineRoom] = useState<string | null>(null);
  const [lineLoadsByRoom, setLineLoadsByRoom] = useState<Record<string, string[]>>(
    {},
  );
  const [occupiedNotice, setOccupiedNotice] = useState<{
    room: string;
    load: string;
    owner: string;
  } | null>(null);
  const [protectiveDraft, setProtectiveDraft] = useState("");
  const needsLineWalkthrough = deviceNeedsLineIdentification(device.type);
  const suggestedProtectiveLabel =
    defaultDeviceCircuitLabel(device, panelDevices) ?? "";
  const confident = isDeviceDetailsConfident(device);
  const manufacturerValue = displaySpecValue(
    getManufacturerBrand(device.brandKey, device.manufacturer)?.label ??
      device.manufacturer,
  );
  const typeValue =
    DEVICE_TYPE_OPTIONS.find((item) => item.type === device.type)?.label ??
    typeShort[device.type];
  const identitySpecs = useMemo(
    () =>
      [
        ["Производитель", manufacturerValue],
        ["Тип", typeValue],
        ["Номинал", displaySpecValue(device.rating)],
      ] as Array<[string, string]>,
    [device.rating, manufacturerValue, typeValue],
  );
  const specs = useMemo(
    () => deviceCharacteristicRows(device),
    [device],
  );

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
    setSheetTop(computeSheetTop(anchorY));
    const onResize = () => setSheetTop(computeSheetTop(anchorY));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anchorY, device.id]);

  useEffect(() => {
    const inferredType =
      knownObjectType ?? inferObjectTypeFromLabel(device.circuitLabel);
    const parsedLoads = parseLineLoads(device.circuitLabel);
    setFlowStep(0);
    setObjectType(inferredType);
    setShowMoreCatalogRooms(false);
    setShowMoreCatalogEquipment(false);
    setSelectedCatalogRooms(knownCatalogRooms);
    setSelectedCatalogEquipment(knownCatalogEquipment);
    setShowCustomCatalogRoomInput(false);
    setShowCustomCatalogEquipmentInput(false);
    setCustomCatalogRoom("");
    setCustomCatalogEquipment("");
    setActiveLineRoom(Object.keys(parsedLoads)[0] ?? null);
    setLineLoadsByRoom(parsedLoads);
    setOccupiedNotice(null);
    setProtectiveDraft(
      device.circuitLabel?.trim() ||
        defaultDeviceCircuitLabel(device, panelDevices) ||
        "",
    );
    // Saving a line updates circuitLabel; that must not bounce the sheet
    // back to the first screen and hide the success step.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply known context only on device change
  }, [device.id]);

  const selectedObjectConfig = objectType ? OBJECT_TYPE_CONFIG[objectType] : null;
  const catalogRoomOptions = useMemo(() => {
    if (!selectedObjectConfig) return [...DEFAULT_ROOM_OPTIONS];
    return showMoreCatalogRooms
      ? [...selectedObjectConfig.roomBase, ...selectedObjectConfig.roomExtra]
      : selectedObjectConfig.roomBase;
  }, [selectedObjectConfig, showMoreCatalogRooms]);
  const catalogEquipmentOptions = useMemo(() => {
    if (!selectedObjectConfig) return [...DEFAULT_LOAD_OPTIONS];
    return showMoreCatalogEquipment
      ? [
          ...selectedObjectConfig.equipmentBase,
          ...selectedObjectConfig.equipmentExtra,
        ]
      : selectedObjectConfig.equipmentBase;
  }, [selectedObjectConfig, showMoreCatalogEquipment]);
  const lineRoomOptions = useMemo(() => {
    if (!selectedObjectConfig) return [];
    const rooms =
      selectedCatalogRooms.length > 0
        ? selectedCatalogRooms
        : [
            ...selectedObjectConfig.roomBase,
            ...selectedObjectConfig.roomExtra,
          ];
    return [selectedObjectConfig.wholeLabel, ...rooms];
  }, [selectedCatalogRooms, selectedObjectConfig]);
  const lineLoadOptions = useMemo(() => {
    if (!selectedObjectConfig) return [...DEFAULT_LOAD_OPTIONS];
    const objectEquipment =
      selectedCatalogEquipment.length > 0
        ? selectedCatalogEquipment
        : [
            ...selectedObjectConfig.equipmentBase,
            ...selectedObjectConfig.equipmentExtra,
          ];
    return Array.from(
      new Set([...CORE_ROOM_LOAD_OPTIONS, ...objectEquipment]),
    );
  }, [selectedCatalogEquipment, selectedObjectConfig]);
  const selectedLineLabel = useMemo(
    () => formatLineLoads(lineLoadsByRoom),
    [lineLoadsByRoom],
  );
  const hasExistingLine = Boolean(device.circuitLabel?.trim());
  const skipObjectStep = Boolean(objectType ?? knownObjectType);
  const canSaveSelection = flowStep === 5 && selectedLineLabel.length > 0;
  const occupiedLoads = useMemo(
    () =>
      collectOccupiedLoads(
        panelDevices.map((item) => ({
          id: item.id,
          name: deviceTitle(item),
          circuitLabel: item.circuitLabel,
        })),
        device.id,
      ),
    [device.id, panelDevices],
  );
  const loadAlarm = useMemo(
    () => assessLineLoadSafety(device, lineLoadsByRoom),
    [device, lineLoadsByRoom],
  );

  const toggleSelectedValue = (
    value: string,
    setSelected: Dispatch<SetStateAction<string[]>>,
  ) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const addCustomOption = (
    value: string,
    options: string[],
    setOptions: Dispatch<SetStateAction<string[]>>,
    setSelected: Dispatch<SetStateAction<string[]>>,
    clear: () => void,
  ) => {
    const next = value.trim();
    if (!next) return;
    if (!options.includes(next)) {
      setOptions((prev) => [...prev, next]);
    }
    setSelected((prev) => (prev.includes(next) ? prev : [...prev, next]));
    clear();
  };
  const toggleLineLoad = (room: string, load: string) => {
    setLineLoadsByRoom((prev) => {
      const current = prev[room] ?? [];
      const nextLoads = current.includes(load)
        ? current.filter((item) => item !== load)
        : [...current, load];
      if (nextLoads.length === 0) {
        const next = { ...prev };
        delete next[room];
        return next;
      }
      return { ...prev, [room]: nextLoads };
    });
  };

  const persistCurrentContext = (nextType: IdentifyObjectType) => {
    onPersistIdentifyContext?.({
      objectType: nextType,
      rooms: selectedCatalogRooms,
      equipment: selectedCatalogEquipment,
    });
  };

  const startIdentifyFlow = () => {
    if (!needsLineWalkthrough) {
      setProtectiveDraft(
        device.circuitLabel?.trim() || suggestedProtectiveLabel,
      );
      setFlowStep(7);
      return;
    }
    const nextType = objectType ?? knownObjectType;
    if (nextType) setObjectType(nextType);
    setFlowStep(nextType ? 2 : 1);
  };

  const startEditExistingLine = () => {
    if (!needsLineWalkthrough) {
      startIdentifyFlow();
      return;
    }
    const parsed = parseLineLoads(device.circuitLabel);
    const nextType =
      objectType ??
      knownObjectType ??
      inferObjectTypeFromLabel(device.circuitLabel) ??
      "apartment";
    const wholeLabel = OBJECT_TYPE_CONFIG[nextType].wholeLabel;
    const parsedRooms = Object.keys(parsed).filter(
      (room) => room !== wholeLabel,
    );
    setObjectType(nextType);
    setLineLoadsByRoom(parsed);
    setSelectedCatalogRooms((prev) =>
      Array.from(new Set([...prev, ...parsedRooms])),
    );
    setActiveLineRoom(Object.keys(parsed)[0] ?? wholeLabel);
    setFlowStep(5);
  };

  const cancelIdentifyFlow = () => {
    setFlowStep(0);
  };

  const handleCallMaster = () => {
    if (!onCallMaster) return;
    onClose();
    onCallMaster();
  };

  useEffect(() => {
    if (flowStep !== 5) return;
    if (!activeLineRoom && lineRoomOptions.length > 0) {
      setActiveLineRoom(lineRoomOptions[0]);
    }
  }, [activeLineRoom, flowStep, lineRoomOptions]);

  const stepCount = skipObjectStep ? 4 : 5;
  const visibleStep =
    flowStep <= 0 ? 0 : skipObjectStep ? Math.max(1, flowStep - 1) : flowStep;
  const goToNextFlowStep = () => {
    setFlowStep((prev) => Math.min(6, prev + 1));
  };

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
        {flowStep === 6 ? (
          <div className="space-y-5 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-[22px] font-semibold text-zinc-900">
                Готово
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">
                {needsLineWalkthrough
                  ? "Теперь определено, за какую линию отвечает этот прибор."
                  : "Подпись для стикера сохранена."}
              </p>
              {(selectedLineLabel || protectiveDraft.trim()) && (
                <p className="mt-3 text-[14px] font-medium text-zinc-800">
                  {selectedLineLabel || protectiveDraft.trim()}
                </p>
              )}
              {loadAlarm && (
                <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 p-3 text-left">
                  <p className="text-[14px] font-semibold text-rose-950">
                    {loadAlarm.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-rose-900/80">
                    {loadAlarm.summary}
                  </p>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        ) : (
          <>
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

        {(identitySpecs.length > 0 || specs.length > 0) && (
          <div className="mb-5 grid grid-cols-2 gap-3">
            {identitySpecs.map(([key, value]) => (
              <EditableSpecCard
                key={key}
                deviceType={device.type}
                label={key}
                value={value}
                editable={Boolean(
                  specEditable && (onUpdateIdentity || onUpdateCharacteristic),
                )}
                onChange={
                  specEditable && (onUpdateIdentity || onUpdateCharacteristic)
                    ? (next) => handleSpecChange(key, next)
                    : undefined
                }
              />
            ))}
            {specs.slice(0, 8).map(([key, value]) => (
              <EditableSpecCard
                key={key}
                deviceType={device.type}
                label={key}
                value={value}
                editable={Boolean(specEditable && onUpdateCharacteristic)}
                onChange={
                  specEditable && onUpdateCharacteristic
                    ? (next) => handleSpecChange(key, next)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {specEditable && onUpdateCharacteristic && (
          <p className="mb-5 text-[12px] leading-relaxed text-amber-800/90">
            {confident
              ? manualSpecEditDisclaimer
              : "Если характеристика не определена (—), укажите её сами, если знаете. Вводной автомат подтверждается отдельной диагностикой, а не по фото."}
          </p>
        )}

        <GlassCard className="mb-5 p-4">
          {flowStep === 0 && (
            <div className="space-y-3">
              <Button
                className="w-full"
                variant="secondary"
                onClick={
                  hasExistingLine && needsLineWalkthrough
                    ? startEditExistingLine
                    : startIdentifyFlow
                }
              >
                {needsLineWalkthrough
                  ? hasExistingLine
                    ? "Исправить линию прибора"
                    : "Определить линию прибора"
                  : hasExistingLine
                    ? "Исправить подпись"
                    : "Подписать прибор"}
              </Button>
            </div>
          )}

          {flowStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {Array.from({ length: stepCount }, (_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      index + 1 <= visibleStep ? "bg-zinc-900" : "bg-zinc-200",
                    )}
                  />
                ))}
              </div>
              <p className="text-[13px] font-medium text-zinc-500">
                Шаг {visibleStep} из {stepCount}
              </p>
              <div className="rounded-[20px] bg-zinc-50 p-4">
                <p className="text-[15px] leading-relaxed text-zinc-900">
                  Перед определением линии укажите тип объекта. Ниже можно
                  отметить помещения и технику, которые есть на объекте.
                </p>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-medium text-zinc-500">
                  Тип объекта
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OBJECT_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setObjectType(option.id);
                        setSelectedCatalogRooms([]);
                        setSelectedCatalogEquipment([]);
                        setShowMoreCatalogRooms(false);
                        setShowMoreCatalogEquipment(false);
                        setShowCustomCatalogRoomInput(false);
                        setShowCustomCatalogEquipmentInput(false);
                        setCustomCatalogRoom("");
                        setCustomCatalogEquipment("");
                        setActiveLineRoom(null);
                        setLineLoadsByRoom({});
                      }}
                      className={cn(
                        "rounded-full px-3 py-1 text-[13px] transition-colors",
                        objectType === option.id
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {objectType && (
                <>
                  <div>
                    <p className="mb-2 text-[12px] font-medium text-zinc-500">
                      Помещения
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogRoomOptions.map((room) => {
                        const active = selectedCatalogRooms.includes(room);
                        return (
                          <button
                            key={room}
                            type="button"
                            onClick={() =>
                              toggleSelectedValue(room, setSelectedCatalogRooms)
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
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {selectedObjectConfig &&
                        selectedObjectConfig.roomExtra.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowMoreCatalogRooms((prev) => !prev)
                            }
                            className="text-[13px] text-zinc-500 underline underline-offset-4"
                          >
                            {showMoreCatalogRooms
                              ? "Скрыть"
                              : "Показать больше"}
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() =>
                          setShowCustomCatalogRoomInput((prev) => !prev)
                        }
                        className="text-[13px] text-zinc-500 underline underline-offset-4"
                      >
                        + Добавить
                      </button>
                    </div>
                    {showCustomCatalogRoomInput && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={customCatalogRoom}
                          onChange={(e) => setCustomCatalogRoom(e.target.value)}
                          placeholder="Добавить помещение"
                          className="h-11 flex-1 rounded-[14px] border border-black/8 bg-white px-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addCustomOption(
                              customCatalogRoom,
                              [...catalogRoomOptions, ...selectedCatalogRooms],
                              setSelectedCatalogRooms,
                              setSelectedCatalogRooms,
                              () => {
                                setCustomCatalogRoom("");
                                setShowCustomCatalogRoomInput(false);
                              },
                            )
                          }
                          className="h-11 rounded-[14px] border border-black/8 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] font-medium text-zinc-500">
                      Техника и оборудование
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogEquipmentOptions.map((item) => {
                        const active = selectedCatalogEquipment.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              toggleSelectedValue(
                                item,
                                setSelectedCatalogEquipment,
                              )
                            }
                            className={cn(
                              "rounded-full px-3 py-1 text-[13px] transition-colors",
                              active
                                ? "bg-zinc-900 text-white"
                                : "bg-zinc-100 text-zinc-600",
                            )}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {selectedObjectConfig &&
                        selectedObjectConfig.equipmentExtra.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowMoreCatalogEquipment((prev) => !prev)
                            }
                            className="text-[13px] text-zinc-500 underline underline-offset-4"
                          >
                            {showMoreCatalogEquipment
                              ? "Скрыть"
                              : "Показать больше"}
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() =>
                          setShowCustomCatalogEquipmentInput((prev) => !prev)
                        }
                        className="text-[13px] text-zinc-500 underline underline-offset-4"
                      >
                        + Добавить
                      </button>
                    </div>
                    {showCustomCatalogEquipmentInput && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={customCatalogEquipment}
                          onChange={(e) =>
                            setCustomCatalogEquipment(e.target.value)
                          }
                          placeholder="Добавить вариант"
                          className="h-11 flex-1 rounded-[14px] border border-black/8 bg-white px-3 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addCustomOption(
                              customCatalogEquipment,
                              [
                                ...catalogEquipmentOptions,
                                ...selectedCatalogEquipment,
                              ],
                              setSelectedCatalogEquipment,
                              setSelectedCatalogEquipment,
                              () => {
                                setCustomCatalogEquipment("");
                                setShowCustomCatalogEquipmentInput(false);
                              },
                            )
                          }
                          className="h-11 rounded-[14px] border border-black/8 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={!objectType}
                onClick={() => {
                  if (!objectType) return;
                  persistCurrentContext(objectType);
                  goToNextFlowStep();
                }}
              >
                Продолжить
              </Button>
              <IdentifyFlowFooter
                onCancel={cancelIdentifyFlow}
                onCallMaster={onCallMaster ? handleCallMaster : undefined}
              />
            </div>
          )}

          {flowStep > 1 && flowStep < 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {Array.from({ length: stepCount }, (_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      index + 1 <= visibleStep ? "bg-zinc-900" : "bg-zinc-200",
                    )}
                  />
                ))}
              </div>
              <p className="text-[13px] font-medium text-zinc-500">
                Шаг {visibleStep} из {stepCount}
              </p>
              <div className="rounded-[20px] bg-zinc-50 p-4">
                <p className="text-[15px] leading-relaxed text-zinc-900">
                  {identifyFlowSteps[flowStep - 2].text}
                </p>
              </div>
              <Button className="w-full" onClick={goToNextFlowStep}>
                {identifyFlowSteps[flowStep - 2].action}
              </Button>
              <IdentifyFlowFooter
                onCancel={cancelIdentifyFlow}
                onCallMaster={onCallMaster ? handleCallMaster : undefined}
              />
            </div>
          )}

          {flowStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {Array.from({ length: stepCount }, (_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      index + 1 <= visibleStep ? "bg-zinc-900" : "bg-zinc-200",
                    )}
                  />
                ))}
              </div>
              <p className="text-[13px] font-medium text-zinc-500">
                Шаг {visibleStep} из {stepCount}
              </p>
              <div className="rounded-[20px] bg-zinc-50 p-4">
                <p className="text-[15px] leading-relaxed text-zinc-900">
                  Обойдите помещения и отметьте, где пропал свет и перестала
                  работать розетка
                </p>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-medium text-zinc-500">
                  Помещения
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lineRoomOptions.map((room) => {
                    const active = activeLineRoom === room;
                    return (
                      <button
                        key={room}
                        type="button"
                        onClick={() => setActiveLineRoom(room)}
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
                <p className="mb-2 text-[12px] font-medium text-zinc-500">
                  {activeLineRoom
                    ? `Нагрузки в помещении «${activeLineRoom}»`
                    : "Выберите помещение"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lineLoadOptions.map((load) => {
                    const selected = activeLineRoom
                      ? (lineLoadsByRoom[activeLineRoom] ?? []).includes(load)
                      : false;
                    const occupiedOwner = activeLineRoom
                      ? occupiedLoads.get(
                          occupiedLoadKey(activeLineRoom, load),
                        )
                      : undefined;
                    const occupied = Boolean(occupiedOwner);
                    return (
                      <button
                        key={load}
                        type="button"
                        disabled={!activeLineRoom}
                        onClick={() => {
                          if (!activeLineRoom) return;
                          if (occupiedOwner) {
                            setOccupiedNotice({
                              room: activeLineRoom,
                              load,
                              owner: occupiedOwner,
                            });
                            return;
                          }
                          toggleLineLoad(activeLineRoom, load);
                        }}
                        className={cn(
                          "rounded-full px-3 py-1 text-[13px] transition-colors",
                          occupied
                            ? "bg-zinc-300 text-zinc-600"
                            : selected
                              ? loadAlarm?.unsafeLoads.includes(load)
                                ? "bg-rose-600 text-white"
                                : "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600",
                          !activeLineRoom && "opacity-50",
                        )}
                      >
                        {load}
                      </button>
                    );
                  })}
                </div>
              </div>
              {Object.keys(lineLoadsByRoom).length > 0 && (
                <div className="space-y-2 rounded-[20px] bg-zinc-50 p-4">
                  <p className="text-[12px] font-medium text-zinc-500">
                    Уже отмечено
                  </p>
                  {Object.entries(lineLoadsByRoom).map(([room, loads]) => (
                    <div key={room}>
                      <p className="mb-1 text-[13px] font-medium text-zinc-700">
                        {room}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {loads.map((load) => (
                          <span
                            key={`${room}-${load}`}
                            className="rounded-full bg-white px-3 py-1 text-[12px] text-zinc-600"
                          >
                            {load}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {loadAlarm && (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <div>
                      <p className="text-[15px] font-semibold text-rose-950">
                        {loadAlarm.title}
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed text-rose-900/85">
                        {loadAlarm.summary}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {loadAlarm.points.map((point, index) => (
                          <li
                            key={index}
                            className="text-[13px] leading-relaxed text-rose-900/80"
                          >
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              <Button
                className="w-full"
                disabled={!canSaveSelection}
                onClick={() => {
                  if (objectType) persistCurrentContext(objectType);
                  onAssignCircuit(device.id, selectedLineLabel);
                  setFlowStep(6);
                }}
              >
                Сохранить
              </Button>
              <IdentifyFlowFooter
                onCancel={cancelIdentifyFlow}
                onCallMaster={onCallMaster ? handleCallMaster : undefined}
              />
            </div>
          )}

          {flowStep === 7 && (
            <div className="space-y-4">
              <div className="rounded-[20px] bg-zinc-50 p-4">
                <p className="text-[15px] leading-relaxed text-zinc-900">
                  {protectiveLabelHint(device.type)}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium text-zinc-500">
                  Подпись на стикере
                </p>
                <input
                  value={protectiveDraft}
                  onChange={(e) => setProtectiveDraft(e.target.value)}
                  placeholder={suggestedProtectiveLabel || "Подпись"}
                  className="h-12 w-full rounded-[16px] border border-black/8 bg-white px-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                />
              </div>
              <Button
                className="w-full"
                disabled={!protectiveDraft.trim()}
                onClick={() => {
                  const next = protectiveDraft.trim();
                  if (!next) return;
                  onAssignCircuit(device.id, next);
                  setFlowStep(6);
                }}
              >
                Сохранить
              </Button>
              <IdentifyFlowFooter
                onCancel={cancelIdentifyFlow}
                onCallMaster={onCallMaster ? handleCallMaster : undefined}
              />
            </div>
          )}
        </GlassCard>
          </>
        )}
      </motion.div>
    </motion.div>
    {occupiedNotice && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
        onClick={() => setOccupiedNotice(null)}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
        >
          <h3 className="mb-2 text-[20px] font-semibold text-zinc-900">
            Нагрузка уже выбрана
          </h3>
          <p className="mb-5 text-[14px] leading-relaxed text-zinc-500">
            «{occupiedNotice.load}» в помещении «{occupiedNotice.room}» уже
            относится к прибору «{occupiedNotice.owner}». Одну и ту же нагрузку
            в одном помещении нельзя назначить двум приборам.
          </p>
          <Button className="w-full" onClick={() => setOccupiedNotice(null)}>
            Понятно
          </Button>
        </motion.div>
      </motion.div>
    )}
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
  panelId,
  photoDataUrl,
  askNameOnBack = false,
  sharedPreview = false,
  onSaveShared,
  onBack,
  onRename,
  onShare,
  onDelete,
  onAssignCircuit,
  onAssignCircuits,
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
  canUseTerminals = false,
}: {
  title?: string;
  panelId?: string | null;
  photoDataUrl?: string | null;
  askNameOnBack?: boolean;
  sharedPreview?: boolean;
  onSaveShared?: () => void;
  onBack: () => void;
  onRename: (name: string) => void;
  onShare?: () => Promise<string>;
  onDelete: () => void;
  onAssignCircuit?: (deviceId: number, label: string) => void;
  onAssignCircuits?: (
    updates: Array<{ deviceId: number; label: string }>,
  ) => void;
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
      series?: string;
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
    safety: number | null;
  }) => void;
  onCallMaster?: () => void;
  devices?: Device[];
  wires?: PanelWire[];
  safetyScore?: number | null;
  phases?: "1" | "3";
  powerKw?: string;
  hasGround?: boolean;
  railCount?: number;
  /** Masters can edit terminal wiring; user mode shows a waitlist sheet. */
  canUseTerminals?: boolean;
}) {
  const devices = devicesProp ?? [];
  const wires = wiresProp ?? [];
  const networkParamsFilled = Boolean(phases && powerKw?.trim());

  const [identifyContext, setIdentifyContext] = useState<IdentifyContext | null>(
    () => loadIdentifyContext(panelId),
  );

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
  const [inputDiagOpen, setInputDiagOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickerBlockedOpen, setStickerBlockedOpen] = useState(false);
  const [terminalsWaitlistOpen, setTerminalsWaitlistOpen] = useState(false);
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

  useEffect(() => {
    setIdentifyContext(loadIdentifyContext(panelId));
  }, [panelId]);

  const persistIdentifyContext = useCallback((context: IdentifyContext) => {
    setIdentifyContext(context);
    saveIdentifyContext(panelId, context);
  }, [panelId]);

  const inferredObjectType = useMemo(() => {
    if (identifyContext?.objectType) return identifyContext.objectType;
    for (const device of devices) {
      const inferred = inferObjectTypeFromLabel(device.circuitLabel);
      if (inferred) return inferred;
    }
    return null;
  }, [devices, identifyContext]);

  const allRailDevices = useMemo(
    () =>
      devices.filter((d) => d.type !== "pe_bus" && d.type !== "n_bus"),
    [devices],
  );
  const unlabeledProtectiveUpdates = useMemo(
    () =>
      allRailDevices.flatMap((device) => {
        if (deviceHasLineIdentification(device.circuitLabel)) return [];
        const label = defaultDeviceCircuitLabel(device, allRailDevices);
        return label ? [{ deviceId: device.id, label }] : [];
      }),
    [allRailDevices],
  );
  const labeledDeviceCount = useMemo(
    () =>
      allRailDevices.filter((device) => {
        if (deviceHasLineIdentification(device.circuitLabel)) return true;
        return Boolean(defaultDeviceCircuitLabel(device, allRailDevices));
      }).length,
    [allRailDevices],
  );
  const unlabeledDeviceCount = Math.max(
    0,
    allRailDevices.length - labeledDeviceCount,
  );
  const allLoadsIdentified = useMemo(
    () => allPanelLoadsIdentified(allRailDevices),
    [allRailDevices],
  );
  const hasInputBreaker = useMemo(
    () => panelHasConfirmedInputBreaker(allRailDevices),
    [allRailDevices],
  );
  const safetyAnalysis = useMemo(() => {
    const powerNum = Number((powerKw ?? "").replace(",", "."));
    return analyzePanelSafety(
      allRailDevices,
      phases,
      Number.isFinite(powerNum) && powerNum > 0 ? powerNum : undefined,
      hasGround,
    );
  }, [allRailDevices, phases, powerKw, hasGround]);
  const safetyKnown = allLoadsIdentified && networkParamsFilled;
  const safetyScore = safetyKnown ? safetyAnalysis.score : null;
  const safetyAdvice = safetyAnalysis.advice;
  const loadMismatchIds = useMemo(() => {
    const ids = new Set<number>();
    for (const device of allRailDevices) {
      if (assessDeviceLineLoadSafety(device)) ids.add(device.id);
    }
    return ids;
  }, [allRailDevices]);
  const applyProtectiveLabels = useCallback(() => {
    if (sharedPreview || unlabeledProtectiveUpdates.length === 0) return;
    if (onAssignCircuits) {
      onAssignCircuits(unlabeledProtectiveUpdates);
      return;
    }
    for (const update of unlabeledProtectiveUpdates) {
      onAssignCircuit?.(update.deviceId, update.label);
    }
  }, [
    onAssignCircuit,
    onAssignCircuits,
    sharedPreview,
    unlabeledProtectiveUpdates,
  ]);

  useEffect(() => {
    applyProtectiveLabels();
  }, [applyProtectiveLabels]);

  const openStickers = () => {
    applyProtectiveLabels();
    const stillUnlabeled = allRailDevices.filter((device) => {
      if (deviceHasLineIdentification(device.circuitLabel)) return false;
      return !defaultDeviceCircuitLabel(device, allRailDevices);
    });
    if (stillUnlabeled.length > 0) {
      setStickerBlockedOpen(true);
      return;
    }
    setStickerOpen(true);
  };

  const rails = useMemo(
    () => groupDevicesByRail(allRailDevices, railCount),
    [allRailDevices, railCount],
  );
  const numRails = rails.length;

  useEffect(() => {
    if (canUseTerminals) return;
    setShowTerminals(false);
    setWireDraft(null);
    setPendingWire(null);
    setEditingWire(null);
    setHoverTerminalKey(null);
  }, [canUseTerminals]);

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
    if (sharedPreview || !onUpdateWires || !showTerminals || !canUseTerminals) return;
    if (event.button !== 0) return;
    event.preventDefault();
    clearWiringHold();
    setHoverTerminalKey(null);
    hapticImpact("medium");
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
    ...rails.map((railDevices) => railModuleTotal(railDevices)),
    1,
  );
  const widestRailDevices = Math.max(...rails.map((rail) => rail.length), 1);
  const railMinWidth = Math.max(
    320,
    widestRailModules * MODULE_PX +
      Math.max(0, widestRailDevices - 1) * DEVICE_GAP_PX +
      32,
  );

  const handleBack = () => {
    if (sharedPreview) {
      if (!onSaveShared) {
        onBack();
        return;
      }
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
    setSafetyOpen(false);
    if (!allLoadsIdentified) {
      onAssessSafety?.({
        phases: nextPhases,
        powerKw: nextPower,
        hasGround: nextHasGround,
        safety: null,
      });
      return;
    }

    const powerNum = Number(nextPower.replace(",", "."));
    const safety = computePanelSafetyScore(
      allRailDevices,
      nextPhases,
      powerNum,
      nextHasGround,
    );
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

  useEffect(() => {
    if (sharedPreview || !onAssessSafety || safetyAssessing) return;
    if (!allLoadsIdentified) {
      if (typeof safetyProp === "number" && phases && powerKw?.trim()) {
        onAssessSafety({
          phases,
          powerKw,
          hasGround: hasGround === true,
          safety: null,
        });
      }
      return;
    }
    if (!phases || !powerKw?.trim()) return;
    const powerNum = Number(powerKw.replace(",", "."));
    if (!Number.isFinite(powerNum) || powerNum <= 0) return;
    const next = computePanelSafetyScore(
      allRailDevices,
      phases,
      powerNum,
      hasGround,
    );
    if (safetyProp === next) return;
    onAssessSafety({
      phases,
      powerKw,
      hasGround: hasGround === true,
      safety: next,
    });
  }, [
    allLoadsIdentified,
    allRailDevices,
    hasGround,
    onAssessSafety,
    phases,
    powerKw,
    safetyAssessing,
    safetyProp,
    sharedPreview,
  ]);

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
            Безопасность щитка
          </div>
          {safetyKnown && safetyAnalysis.axes ? (
            <div className="mt-2">
              <SafetyAxisMeters axes={safetyAnalysis.axes} compact />
            </div>
          ) : (
            <>
              <div className="text-[16px] font-semibold text-zinc-400">
                Не посчитан
              </div>
              <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                {!allLoadsIdentified
                  ? "Сначала определите нагрузки — затем появятся оценки человека, пожара и техники"
                  : networkParamsFilled
                    ? "Нажмите, чтобы узнать, как считаются три оценки"
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
        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              "text-[13px] font-medium transition-colors",
              showTerminals && canUseTerminals ? "text-zinc-900" : "text-zinc-500",
            )}
          >
            Клеммы
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showTerminals && canUseTerminals}
            aria-label="Клеммы"
            onClick={() => {
              if (!canUseTerminals) {
                setShowTerminals(false);
                setTerminalsWaitlistOpen(true);
                return;
              }
              setTab("scheme");
              setShowTerminals((prev) => {
                const next = !prev;
                if (!next) {
                  setWireDraft(null);
                  setPendingWire(null);
                  setEditingWire(null);
                  setHoverTerminalKey(null);
                }
                return next;
              });
            }}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
              showTerminals && canUseTerminals ? "bg-zinc-900" : "bg-zinc-200",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
                showTerminals && canUseTerminals && "translate-x-5",
              )}
            />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto lg:pb-8">
      <div className="flex min-h-full flex-col lg:flex-row lg:items-start lg:gap-6 lg:px-10">
      {tab === "scheme" ? (
        <div className="px-5 pb-4 lg:min-w-0 lg:flex-1 lg:px-0">
          {!sharedPreview && !hasInputBreaker && (
            <GlassCard className="mb-4 space-y-3 p-4">
              <div>
                <p className="text-[15px] font-semibold text-zinc-900">
                  Найдите вводной автомат
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                  После оцифровки тип «вводной» не ставится автоматически —
                  подтвердите его диагностикой. Характеристики приборов можно
                  поправить в карточке (пустые поля — «—»).
                </p>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setSelectedId(null);
                  setSheetAnchorY(null);
                  setInputDiagOpen(true);
                }}
              >
                Запустить диагностику
              </Button>
            </GlassCard>
          )}
          {!sharedPreview && hasInputBreaker && (
            <GlassCard className="mb-4 p-4">
              <p className="text-[13px] leading-relaxed text-zinc-600">
                Вводной автомат подписан. Остальные линии определите в карточке
                каждого прибора на схеме.
              </p>
            </GlassCard>
          )}
          <div className={cn("overflow-x-auto", showTerminals && canUseTerminals && "overflow-y-visible")}>
            <GlassCard
              className={cn(
                "w-max max-w-none overflow-visible p-4",
                showTerminals && canUseTerminals && "overflow-visible",
              )}
              style={{ minWidth: railMinWidth }}
            >
            <div className="mb-3 flex items-center justify-end">
              <span className="text-[12px] text-zinc-400">
                {allRailDevices.length} приборов
              </span>
            </div>

            <div
              ref={setSchemeCanvasRef}
              className={cn("relative", showTerminals && canUseTerminals && "py-11")}
            >              {showTerminals && canUseTerminals && (
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
              {rails.map((railDevices, railIdx) => {
                const railModules = railModuleTotal(railDevices);
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
                      {railDevices.map((device, deviceIdx) => (
                        <DeviceBlock
                          key={`${device.id}-${deviceIdx}`}
                          device={device}
                          selected={selectedId === device.id}
                          showTerminals={showTerminals && canUseTerminals}
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
                            sharedPreview || !canUseTerminals
                              ? undefined
                              : handleTerminalPointerDown
                          }
                          caption={
                            defaultDeviceCircuitLabel(device, allRailDevices) ??
                            undefined
                          }
                          loadMismatch={loadMismatchIds.has(device.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
          </div>

          <button
            type="button"
            onClick={openStickers}
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
      <div className="mt-auto grid grid-cols-2 gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 lg:hidden">
        {networkSafetyCards}
      </div>
      </div>
      </div>

      <AnimatePresence>
        {stickerOpen && (
          <StickerDesigner
            rails={rails}
            panelTitle={title}
            editable={!sharedPreview}
            onClose={() => setStickerOpen(false)}
            onUpdate={sharedPreview ? undefined : onUpdateDeviceSticker}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stickerBlockedOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-6"
              onClick={() => setStickerBlockedOpen(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[430px] rounded-t-[28px] border border-black/[0.06] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_20px_60px_rgba(17,17,19,0.15)] sm:rounded-[28px]"
              >
                <h3 className="mb-2 text-[20px] font-semibold text-zinc-900">
                  Стикеры пока недоступны
                </h3>
                <p className="text-[14px] leading-relaxed text-zinc-500">
                  Стикеры можно распечатать после того, как у каждого прибора
                  на схеме будет подпись.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-700">
                  {labeledDeviceCount === 0
                    ? `Надо заполнить информацию по ${devicesDativePhrase(allRailDevices.length)}.`
                    : `Уже заполнено ${labeledDeviceCount} из ${allRailDevices.length} ${deviceWord(allRailDevices.length)}. ${remainingDevicesPhrase(unlabeledDeviceCount)}`}
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
                  Автоматы и дифавтоматы: нажмите на прибор и выберите
                  «Определить линию прибора». Нужно будет отключить рычаг,
                  обойти помещения и отметить, где пропал свет или перестала
                  работать техника.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-zinc-500">
                  Ввод, УЗО, реле напряжения и УЗИП не кормят одну комнату —
                  на стикере будет их роль в щитке, например «Ввод» или
                  «УЗО 1». Подпись можно поправить, нажав на прибор.
                </p>
                <Button
                  className="mt-5 w-full"
                  onClick={() => setStickerBlockedOpen(false)}
                >
                  Понятно
                </Button>
              </motion.div>
            </motion.div>
          </Portal>
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
        {terminalsWaitlistOpen && (
          <WaitlistSheet
            kind="terminals"
            onClose={() => setTerminalsWaitlistOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inputDiagOpen && (
          <InputBreakerDiagnosticsSheet
            devices={allRailDevices}
            onClose={() => {
              setInputDiagOpen(false);
              setSelectedId(null);
            }}
            onHighlightDevice={(deviceId) => {
              setSelectedId(deviceId);
            }}
            onConfirmInputBreaker={(deviceId) => {
              onUpdateDeviceIdentity?.(deviceId, { type: "main_breaker" });
              onAssignCircuit?.(deviceId, "Ввод");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && tab === "scheme" && !inputDiagOpen && (
          <DeviceSheet
            device={selected}
            anchorY={sheetAnchorY}
            specEditable={!sharedPreview}
            knownObjectType={inferredObjectType}
            knownCatalogRooms={identifyContext?.rooms ?? []}
            knownCatalogEquipment={identifyContext?.equipment ?? []}
            panelDevices={devices}
            onPersistIdentifyContext={persistIdentifyContext}
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
            onCallMaster={
              onCallMaster
                ? () => {
                    setSelectedId(null);
                    setSheetAnchorY(null);
                    onCallMaster();
                  }
                : undefined
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
            axes={safetyKnown ? safetyAnalysis.axes : null}
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
                Считаем защиту человека, пожарную безопасность и защиту техники…
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
