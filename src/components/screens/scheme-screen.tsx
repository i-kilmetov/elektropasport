"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Building2,
  Gauge,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
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
  DeviceFaceStatic,
  DeviceStatusBar,
  DEVICE_GAP_PX,
  MODULE_PX,
  BODY_HEIGHT_PX,
  deviceFaceHeight,
} from "@/components/icons/device-face";
import {
  findTerminalAtPoint,
  PanelWiresSvg,
} from "@/components/scheme/panel-wires-svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UndoSnackbarHost } from "@/components/ui/undo-snackbar";
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
import { SchemeOnboardingTour } from "@/components/ui/scheme-onboarding-tour";
import { deviceTypeGuide } from "@/lib/panel-device-guide";
import {
  markSchemeTourSeen,
  shouldRunSchemeTour,
} from "@/lib/scheme-onboarding";
import {
  formatBuildingYear,
  type PanelHouseSnapshot,
} from "@/lib/house-insight";
import {
  manualSpecEditDisclaimer,
} from "@/lib/device-spec-guide";
import {
  createWireId,
  sameTerminal,
  terminalKey,
  wireConnectsSamePair,
} from "@/lib/panel-wires";
import { hapticContextMenu, hapticImpact, hapticNotification } from "@/lib/haptics";
import {
  analyzePanelSafety,
  computePanelSafetyScore,
} from "@/lib/safety-score";
import { CatalogPickerSheet } from "@/components/screens/catalog-picker-sheet";
import { PanelDeviceGuideSection } from "@/components/screens/panel-device-guide-section";
import { useRailEdit } from "@/components/scheme/use-rail-edit";
import { productToDevice, type CatalogProduct } from "@/lib/device-catalog";
import { StickerDesigner } from "@/components/screens/sticker-designer";
import {
  deviceModules,
  deriveRailCount,
  groupDevicesByRail,
  railModuleTotal,
} from "@/lib/panel-rails";
import { appendDevice, nextDeviceId } from "@/lib/panel-edit";
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
import {
  isAutoRoleCircuitLabel,
  rcdSchemeCaption,
} from "@/lib/panel-protection";
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
  onPressStart,
  onTerminalPointerDown,
  caption,
  loadMismatch = false,
  editing = false,
  jiggling = false,
  lifted = false,
  onDelete,
}: {
  device: Device;
  selected: boolean;
  showTerminals: boolean;
  highlightTerminalKey?: string | null;
  onSelect: (clientY: number) => void;
  onPressStart?: (event: PointerEvent<HTMLButtonElement>) => void;
  onTerminalPointerDown?: (
    terminal: { deviceId: number; side: "top" | "bottom"; index: number },
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  caption?: string;
  loadMismatch?: boolean;
  editing?: boolean;
  jiggling?: boolean;
  lifted?: boolean;
  onDelete?: () => void;
}) {
  const modules = deviceModules(device);
  const width = modules * MODULE_PX;
  const confident = isDeviceDetailsConfident(device);
  const loadTone = loadMismatch
    ? "mismatch"
    : deviceHasSpecifiedLineLoads(device)
      ? "ok"
      : null;
  const storedLabel = device.circuitLabel?.trim();
  const bottomCaption =
    caption?.trim() ||
    (storedLabel && !isAutoRoleCircuitLabel(device.type, storedLabel)
      ? storedLabel
      : undefined);
  const jiggleClass =
    jiggling && !lifted
      ? `panel-jiggle panel-jiggle-${["a", "b", "c"][Math.abs(device.id) % 3]}`
      : undefined;

  return (
    <motion.div
      layout={!lifted}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className="flex flex-col items-stretch"
      style={{
        width,
        flex: "none",
        visibility: lifted ? "hidden" : "visible",
      }}
    >
      <span
        className={cn(
          "mb-1 line-clamp-1 min-h-[14px] text-left text-[10px] font-medium leading-tight",
          confident ? "text-zinc-500" : "text-transparent",
        )}
      >
        {confident ? typeShort[device.type] : "·"}
      </span>
      <div className={cn("relative", jiggleClass)}>
        {editing && onDelete && (
          <button
            type="button"
            aria-label={`Удалить ${device.name}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="absolute -left-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-400 text-white shadow-sm"
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </button>
        )}
        <DeviceFace
          device={device}
          modules={modules}
          selected={selected && !editing}
          showTerminals={showTerminals}
          interactiveTerminals={showTerminals && !editing}
          highlightTerminalKey={highlightTerminalKey}
          showDetails={confident}
          onSelect={(event) => onSelect(event.clientY)}
          onPressStart={onPressStart}
          onTerminalPointerDown={editing ? undefined : onTerminalPointerDown}
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
        {loadMismatch && !editing && (
          <span
            className="pointer-events-none absolute -right-1 -top-1 z-[6] flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
            title="Нагрузка не соответствует номиналу"
          >
            <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.75} />
          </span>
        )}
      </div>
      <DeviceStatusBar tone={loadTone} />
      {bottomCaption && (
        <span className="mt-1 line-clamp-3 text-left text-[10px] font-medium leading-tight text-zinc-600">
          {bottomCaption}
        </span>
      )}
    </motion.div>
  );
}

function RailInsertGap({
  modules,
  showTerminals,
}: {
  modules: number;
  showTerminals: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-stretch"
      style={{ width: modules * MODULE_PX, flex: "none" }}
    >
      <span className="mb-1 min-h-[14px]" />
      <div
        className="rounded-[8px] border-2 border-dashed border-zinc-300 bg-zinc-100/80"
        style={{ height: deviceFaceHeight(showTerminals) }}
      />
    </motion.div>
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

function meaningfulCircuitLabel(
  device: Pick<Device, "type" | "circuitLabel">,
): string {
  const stored = device.circuitLabel?.trim() ?? "";
  if (!stored || isAutoRoleCircuitLabel(device.type, stored)) return "";
  return stored;
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
  wires = [],
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
  wires?: PanelWire[];
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
  const [draftType, setDraftType] = useState<DeviceType>(device.type);
  const [draftManufacturer, setDraftManufacturer] = useState(
    device.manufacturer ?? "",
  );
  const [draftBrandKey, setDraftBrandKey] = useState(device.brandKey);
  const [draftRating, setDraftRating] = useState(device.rating ?? "");
  const [draftCharacteristics, setDraftCharacteristics] = useState<
    Record<string, string>
  >(device.characteristics ?? {});
  const needsLineWalkthrough = deviceNeedsLineIdentification(device.type);
  const suggestedProtectiveLabel =
    device.type === "rcd"
      ? (rcdSchemeCaption(device, panelDevices, wires) ?? "")
      : (defaultDeviceCircuitLabel(device, panelDevices) ?? "");
  const draftDevice = useMemo(
    () => ({
      ...device,
      type: draftType,
      manufacturer: draftManufacturer,
      brandKey: draftBrandKey,
      rating: draftRating,
      characteristics: draftCharacteristics,
    }),
    [
      device,
      draftType,
      draftManufacturer,
      draftBrandKey,
      draftRating,
      draftCharacteristics,
    ],
  );
  const confident = isDeviceDetailsConfident(draftDevice);
  const manufacturerValue = displaySpecValue(
    getManufacturerBrand(draftBrandKey, draftManufacturer)?.label ??
      draftManufacturer,
  );
  const typeValue =
    DEVICE_TYPE_OPTIONS.find((item) => item.type === draftType)?.label ??
    typeShort[draftType];
  const identitySpecs = useMemo(
    () =>
      [
        ["Производитель", manufacturerValue],
        ["Тип", typeValue],
        ["Номинал", displaySpecValue(draftRating)],
      ] as Array<[string, string]>,
    [draftRating, manufacturerValue, typeValue],
  );
  const specs = useMemo(
    () => deviceCharacteristicRows(draftDevice),
    [draftDevice],
  );

  const handleSpecChange = (key: string, next: string) => {
    if (key === "Производитель") {
      const brand = MANUFACTURER_BRANDS.find((item) => item.label === next);
      setDraftManufacturer(brand?.label ?? next);
      setDraftBrandKey(brand?.key);
      return;
    }
    if (key === "Тип") {
      const option = DEVICE_TYPE_OPTIONS.find((item) => item.label === next);
      if (option) setDraftType(option.type);
      return;
    }
    if (key === "Номинал") {
      setDraftRating(next);
      setDraftCharacteristics((prev) => ({
        ...prev,
        Номинал: next,
        ...(!prev["Номинальный ток"] ? { "Номинальный ток": next } : {}),
      }));
      return;
    }
    setDraftCharacteristics((prev) => ({ ...prev, [key]: next }));
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
    const meaningful = meaningfulCircuitLabel(device);
    const parsedLoads = parseLineLoads(meaningful || undefined);
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
    setDraftType(device.type);
    setDraftManufacturer(device.manufacturer ?? "");
    setDraftBrandKey(device.brandKey);
    setDraftRating(device.rating ?? "");
    setDraftCharacteristics(device.characteristics ?? {});
    setProtectiveDraft(
      meaningful ||
        (device.type === "rcd"
          ? (rcdSchemeCaption(device, panelDevices, wires) ?? "")
          : "") ||
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
  const persistedLineLabel = meaningfulCircuitLabel(device);
  const hasExistingLine = Boolean(persistedLineLabel);
  const skipObjectStep = Boolean(objectType ?? knownObjectType);
  const specsDirty =
    draftType !== device.type ||
    (draftManufacturer || "") !== (device.manufacturer || "") ||
    (draftBrandKey || "") !== (device.brandKey || "") ||
    (draftRating || "") !== (device.rating || "") ||
    JSON.stringify(draftCharacteristics ?? {}) !==
      JSON.stringify(device.characteristics ?? {});
  const lineSelectionDirty =
    flowStep === 5 &&
    selectedLineLabel.length > 0 &&
    selectedLineLabel !== persistedLineLabel;
  const protectiveDirty =
    flowStep === 7 &&
    protectiveDraft.trim().length > 0 &&
    protectiveDraft.trim() !==
      (persistedLineLabel || suggestedProtectiveLabel);
  const sheetDirty = specsDirty || lineSelectionDirty || protectiveDirty;
  const canSaveSheet = sheetDirty;
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

  const persistDraftSpecs = () => {
    if (!specsDirty) return;
    const identityPatch: {
      type?: DeviceType;
      manufacturer?: string;
      brandKey?: string;
    } = {};
    if (draftType !== device.type) identityPatch.type = draftType;
    if ((draftManufacturer || "") !== (device.manufacturer || "")) {
      identityPatch.manufacturer = draftManufacturer;
    }
    if ((draftBrandKey || "") !== (device.brandKey || "")) {
      identityPatch.brandKey = draftBrandKey;
    }
    if (Object.keys(identityPatch).length > 0) {
      onUpdateIdentity?.(device.id, identityPatch);
    }
    if ((draftRating || "") !== (device.rating || "")) {
      onUpdateCharacteristic?.(device.id, "Номинал", draftRating);
    }
    const original = device.characteristics ?? {};
    for (const [key, value] of Object.entries(draftCharacteristics)) {
      if (key === "Номинал") continue;
      if ((original[key] ?? "") !== (value ?? "")) {
        onUpdateCharacteristic?.(device.id, key, value);
      }
    }
  };

  const handleSaveSheet = () => {
    if (!canSaveSheet) return;
    persistDraftSpecs();
    if (lineSelectionDirty) {
      if (objectType) persistCurrentContext(objectType);
      onAssignCircuit(device.id, selectedLineLabel);
      setFlowStep(6);
      return;
    }
    if (protectiveDirty) {
      onAssignCircuit(device.id, protectiveDraft.trim());
      setFlowStep(6);
    }
  };

  const startIdentifyFlow = () => {
    if (!needsLineWalkthrough) {
      setProtectiveDraft(persistedLineLabel || suggestedProtectiveLabel);
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
    const parsed = parseLineLoads(persistedLineLabel || undefined);
    const nextType =
      objectType ??
      knownObjectType ??
      inferObjectTypeFromLabel(persistedLineLabel || undefined) ??
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
            {persistedLineLabel && (
              <p className="mt-1 text-[13px] text-zinc-600">
                Линия: {persistedLineLabel}
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
                deviceType={draftType}
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
                deviceType={draftType}
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
              <IdentifyFlowFooter
                onCancel={cancelIdentifyFlow}
                onCallMaster={onCallMaster ? handleCallMaster : undefined}
              />
            </div>
          )}
        </GlassCard>

        {canSaveSheet && (
          <div className="mt-4">
            <Button className="w-full" onClick={handleSaveSheet}>
              Сохранить
            </Button>
          </div>
        )}
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
  onUpdateDevices,
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
  houseSnapshot,
  onEditHouse,
  startOnboarding = false,
  onOnboardingDone,
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
  onUpdateDevices?: (devices: Device[], railCount?: number) => void;
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
  /** Address / year / kapremont snapshot for this dwelling */
  houseSnapshot?: PanelHouseSnapshot;
  onEditHouse?: () => void;
  /** After photo analysis — run the section spotlight tour once. */
  startOnboarding?: boolean;
  onOnboardingDone?: () => void;
}) {
  const devices = Array.isArray(devicesProp) ? devicesProp : [];
  const wires = Array.isArray(wiresProp) ? wiresProp : [];
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
  const [pendingDelete, setPendingDelete] = useState(false);
  const [nameOnBackOpen, setNameOnBackOpen] = useState(false);
  const [saveSharedOpen, setSaveSharedOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
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

  useEffect(() => {
    if (sharedPreview || !startOnboarding) return;
    if (!panelId) return;
    if (!shouldRunSchemeTour(panelId, true)) {
      onOnboardingDone?.();
      return;
    }
    const timer = window.setTimeout(() => {
      setTab("scheme");
      setTourOpen(true);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [startOnboarding, sharedPreview, panelId, onOnboardingDone]);

  const finishSchemeTour = useCallback(() => {
    if (panelId) markSchemeTourSeen(panelId);
    setTourOpen(false);
    onOnboardingDone?.();
  }, [panelId, onOnboardingDone]);

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
        if (device.type === "rcd") return [];
        if (meaningfulCircuitLabel(device)) return [];
        const label = defaultDeviceCircuitLabel(device, allRailDevices);
        return label ? [{ deviceId: device.id, label }] : [];
      }),
    [allRailDevices],
  );
  const labeledDeviceCount = useMemo(
    () =>
      allRailDevices.filter((device) => {
        if (meaningfulCircuitLabel(device)) return true;
        if (device.type === "rcd") {
          return Boolean(rcdSchemeCaption(device, allRailDevices, wires));
        }
        return Boolean(defaultDeviceCircuitLabel(device, allRailDevices));
      }).length,
    [allRailDevices, wires],
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
      if (device.type === "rcd") return false;
      const stored = device.circuitLabel?.trim();
      if (stored && !isAutoRoleCircuitLabel(device.type, stored)) return false;
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
  const commitDevices = useCallback(
    (nextRail: Device[]) => {
      const buses = devices.filter(
        (device) => device.type === "pe_bus" || device.type === "n_bus",
      );
      onUpdateDevices?.([...nextRail, ...buses], deriveRailCount(nextRail));
    },
    [devices, onUpdateDevices],
  );
  const railEdit = useRailEdit({
    devices: allRailDevices,
    railCount,
    enabled: !sharedPreview && Boolean(onUpdateDevices),
    onCommit: commitDevices,
  });
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const boardRails = railEdit.displayRails;
  const numRails = boardRails.length;

  useEffect(() => {
    if (!railEdit.editing) return;
    setSelectedId(null);
    setSheetAnchorY(null);
  }, [railEdit.editing]);

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
    ...boardRails.map((railDevices) => railModuleTotal(railDevices)),
    railEdit.dragging ? deviceModules(railEdit.dragging) : 1,
    1,
  );
  const widestRailDevices = Math.max(...boardRails.map((rail) => rail.length), 1);
  const railMinWidth = Math.max(
    320,
    widestRailModules * MODULE_PX +
      Math.max(0, widestRailDevices - 1) * DEVICE_GAP_PX +
      32,
  );

  const handleBack = () => {
    if (railEdit.editing) {
      railEdit.exitEdit();
      return;
    }
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
      <div className="min-w-0 col-span-2 lg:col-span-1">
        <GlassCard className="flex h-full flex-col p-4 lg:p-5">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-zinc-500">
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            Дом
          </div>
          {houseSnapshot ? (
            <div className="space-y-2">
              <p className="text-[14px] font-semibold leading-snug text-zinc-900">
                {houseSnapshot.address}
              </p>
              <p className="text-[13px] text-zinc-600">
                Год постройки:{" "}
                <span className="font-medium text-zinc-800">
                  {formatBuildingYear(houseSnapshot.buildingYear)}
                </span>
              </p>
              <p className="text-[13px] leading-snug text-zinc-600">
                {houseSnapshot.groundingTitle}. {houseSnapshot.groundingSummary}
              </p>
              {houseSnapshot.dataSource && (
                <p className="text-[11px] text-zinc-400">
                  Источник: {houseSnapshot.dataSource}
                </p>
              )}
              {!sharedPreview && onEditHouse && (
                <button
                  type="button"
                  onClick={onEditHouse}
                  className="pt-1 text-[13px] font-medium text-zinc-700 underline-offset-2 hover:underline"
                >
                  Изменить адрес
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[13px] leading-snug text-zinc-400">
                Укажите адрес дома — подскажем год постройки и заземление.
              </p>
              {!sharedPreview && onEditHouse && (
                <button
                  type="button"
                  onClick={onEditHouse}
                  className="mt-2 text-[13px] font-medium text-zinc-700 underline-offset-2 hover:underline"
                >
                  Указать адрес
                </button>
              )}
            </div>
          )}
        </GlassCard>
      </div>
      <button
        type="button"
        data-scheme-tour="network"
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
        data-scheme-tour="safety"
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
                      setPendingDelete(true);
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
        <div className="flex items-center gap-2" data-scheme-tour="tabs">
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
        <div
          className="ml-auto flex items-center gap-2"
          data-scheme-tour="terminals"
        >
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
              data-scheme-tour="scheme"
              className={cn(
                "w-max max-w-none overflow-visible p-4",
                showTerminals && canUseTerminals && "overflow-visible",
              )}
              style={{ minWidth: railMinWidth }}
            >
            <div className="mb-3 flex items-center justify-between gap-3">
              {railEdit.editing && !sharedPreview ? (
                <button
                  type="button"
                  onClick={railEdit.exitEdit}
                  className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-[13px] font-semibold text-white"
                >
                  Готово
                </button>
              ) : sharedPreview ? (
                <span />
              ) : (
                <span className="text-[12px] text-zinc-400">
                  Удерживайте прибор, чтобы изменить схему
                </span>
              )}
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
              {boardRails.map((railDevices, railIdx) => {
                const railModules =
                  railModuleTotal(railDevices) +
                  (railEdit.dropSlot?.rail === railIdx &&
                  !railEdit.dropSlot.isNewRail &&
                  railEdit.dragging
                    ? deviceModules(railEdit.dragging)
                    : 0);
                const isLastRail = railIdx === boardRails.length - 1;
                const nodes: ReactNode[] = [];
                railDevices.forEach((device, deviceIdx) => {
                  if (
                    railEdit.dropSlot &&
                    !railEdit.dropSlot.isNewRail &&
                    railEdit.dropSlot.rail === railIdx &&
                    railEdit.dropSlot.index === deviceIdx &&
                    railEdit.dragging
                  ) {
                    nodes.push(
                      <RailInsertGap
                        key={`gap-${railIdx}-${deviceIdx}`}
                        modules={deviceModules(railEdit.dragging)}
                        showTerminals={showTerminals && canUseTerminals}
                      />,
                    );
                  }
                  nodes.push(
                    <DeviceBlock
                      key={device.id}
                      device={device}
                      selected={selectedId === device.id}
                      showTerminals={showTerminals && canUseTerminals}
                      highlightTerminalKey={
                        hoverTerminalKey ??
                        (wireDraft ? terminalKey(wireDraft.from) : null)
                      }
                      editing={railEdit.editing}
                      jiggling={railEdit.editing}
                      lifted={railEdit.draggingId === device.id}
                      onDelete={
                        sharedPreview || !onUpdateDevices
                          ? undefined
                          : () => railEdit.deleteDevice(device.id)
                      }
                      onPressStart={
                        sharedPreview || !onUpdateDevices
                          ? undefined
                          : (event) => {
                              const face =
                                event.currentTarget.parentElement?.getBoundingClientRect() ??
                                event.currentTarget.getBoundingClientRect();
                              railEdit.onDevicePointerDown(device, event, face);
                            }
                      }
                      onSelect={(clientY) => {
                        if (wireDraft || railEdit.editing) return;
                        if (railEdit.consumeClick()) return;
                        setSheetAnchorY(clientY);
                        setSelectedId(device.id);
                      }}
                      onTerminalPointerDown={
                        sharedPreview ||
                        !canUseTerminals ||
                        railEdit.editing
                          ? undefined
                          : handleTerminalPointerDown
                      }
                      caption={
                        device.type === "rcd"
                          ? (rcdSchemeCaption(
                              device,
                              allRailDevices,
                              wires,
                            ) ?? undefined)
                          : (defaultDeviceCircuitLabel(
                              device,
                              allRailDevices,
                            ) ?? undefined)
                      }
                      loadMismatch={loadMismatchIds.has(device.id)}
                    />,
                  );
                });
                if (
                  railEdit.dropSlot &&
                  !railEdit.dropSlot.isNewRail &&
                  railEdit.dropSlot.rail === railIdx &&
                  railEdit.dropSlot.index === railDevices.length &&
                  railEdit.dragging
                ) {
                  nodes.push(
                    <RailInsertGap
                      key={`gap-${railIdx}-end`}
                      modules={deviceModules(railEdit.dragging)}
                      showTerminals={showTerminals && canUseTerminals}
                    />,
                  );
                }
                return (
                  <div key={railIdx} className={railIdx > 0 ? "mt-5" : ""}>
                    {(numRails > 1 || railEdit.editing) && (
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
                      data-rail-drop={railIdx}
                      className="mb-2 flex min-h-[40px] items-start"
                      style={{ gap: DEVICE_GAP_PX }}
                    >
                      {nodes}
                      {isLastRail && !sharedPreview && onUpdateDevices && (
                        <button
                          type="button"
                          aria-label="Добавить прибор"
                          onClick={() => {
                            hapticImpact("light");
                            setAddPickerOpen(true);
                          }}
                          className="mt-[18px] flex shrink-0 items-center justify-center rounded-[8px] border-2 border-dashed border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-800"
                          style={{
                            width: MODULE_PX,
                            height: BODY_HEIGHT_PX,
                          }}
                        >
                          <Plus className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {railEdit.dragging && railEdit.canAddRail && (
                <div
                  data-new-rail-zone={railEdit.newRailIndex}
                  className={cn(
                    "mt-4 rounded-[16px] border-2 border-dashed px-3 py-4 transition-colors",
                    railEdit.dropSlot?.isNewRail
                      ? "border-zinc-900 bg-zinc-900/[0.06]"
                      : "border-zinc-200 bg-zinc-50",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[12px] font-semibold",
                        railEdit.dropSlot?.isNewRail
                          ? "text-zinc-900"
                          : "text-zinc-500",
                      )}
                    >
                      {railEdit.dropSlot?.isNewRail
                        ? "Отпустите — появится новая рейка"
                        : "Перетащите сюда, чтобы создать рейку"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Ряд {railEdit.newRailIndex + 1}
                    </span>
                  </div>
                  <div className="mb-2 h-2 rounded-full bg-gradient-to-r from-zinc-400 via-zinc-200 to-zinc-400" />
                  <div className="flex items-start" style={{ gap: DEVICE_GAP_PX }}>
                    {railEdit.dropSlot?.isNewRail && railEdit.dragging ? (
                      <RailInsertGap
                        modules={deviceModules(railEdit.dragging)}
                        showTerminals={showTerminals && canUseTerminals}
                      />
                    ) : (
                      <div
                        className="rounded-[8px] border border-dashed border-zinc-200"
                        style={{ width: MODULE_PX * 3, height: 48 }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
          </div>

          <button
            type="button"
            data-scheme-tour="stickers"
            onClick={openStickers}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-black/8 bg-white px-4 py-3 text-[14px] font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <StickerBadgeIcon className="h-4 w-4 text-zinc-600" />
            Стикеры в щиток
          </button>

          <div data-scheme-tour="guide">
            <PanelDeviceGuideSection
              devices={allRailDevices}
              onCallMaster={onCallMaster}
            />
          </div>
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
            panelDevices={allRailDevices}
            wires={wires}
            editable={!sharedPreview}
            onClose={() => setStickerOpen(false)}
            onUpdate={sharedPreview ? undefined : onUpdateDeviceSticker}
          />
        )}
      </AnimatePresence>

      <SchemeOnboardingTour open={tourOpen} onClose={finishSchemeTour} />

      <CatalogPickerSheet
        type={null}
        open={addPickerOpen}
        allowTypeSwitch
        title="Добавить прибор"
        onClose={() => setAddPickerOpen(false)}
        onPick={(product: CatalogProduct) => {
          const device = {
            ...productToDevice(product, {
              id: nextDeviceId(devices),
              position: 0,
              status: "verified",
            }),
            confidence: 100,
          };
          const next = appendDevice(allRailDevices, device);
          setAddPickerOpen(false);
          if (!next) {
            hapticImpact("rigid");
            return;
          }
          hapticNotification("success");
          commitDevices(next);
          railEdit.enterEdit();
        }}
      />

      {railEdit.dragging && railEdit.pointer && (
        <Portal>
          <div
            className="pointer-events-none fixed z-[180] origin-top-left"
            style={{
              left: railEdit.pointer.x - railEdit.grab.x,
              top: railEdit.pointer.y - railEdit.grab.y,
              transform: "scale(1.08)",
              filter: "drop-shadow(0 16px 28px rgba(17,17,19,0.28))",
            }}
          >
            <DeviceFaceStatic
              device={railEdit.dragging}
              modules={deviceModules(railEdit.dragging)}
              showTerminals={showTerminals && canUseTerminals}
              showDetails={isDeviceDetailsConfident(railEdit.dragging)}
              brand={
                isDeviceDetailsConfident(railEdit.dragging) &&
                (railEdit.dragging.manufacturer ||
                  railEdit.dragging.brandKey) ? (
                  <DeviceFaceIdentityMark
                    brandKey={railEdit.dragging.brandKey}
                    brand={railEdit.dragging.manufacturer}
                    series={railEdit.dragging.series}
                  />
                ) : undefined
              }
            />
          </div>
        </Portal>
      )}

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
                  Ввод, реле напряжения и УЗИП получают рольную подпись. УЗО на
                  схеме и наклейке показывает, какие линии/автоматы идут через
                  него. Подпись можно поправить, нажав на прибор.
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
            wires={wires}
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

      <UndoSnackbarHost
        action={
          pendingDelete
            ? {
                key: `delete-panel-${panelId ?? title}`,
                message: "Щиток будет удалён",
                onUndo: () => setPendingDelete(false),
                onCommit: () => {
                  setPendingDelete(false);
                  onDelete();
                },
              }
            : null
        }
      />

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
