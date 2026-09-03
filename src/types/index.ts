import type { PanelHouseSnapshot } from "@/lib/house-insight";
import type { NoPanelSetupId } from "@/lib/no-panel-setups";

export type { PanelHouseSnapshot } from "@/lib/house-insight";

export type DeviceType =
  | "main_breaker"
  | "rcd"
  | "diff_breaker"
  | "voltage_relay"
  | "breaker"
  | "spd"
  | "afdd"
  | "pe_bus"
  | "n_bus";

export type DeviceStatus = "verified" | "pending" | "unknown";

export interface Device {
  id: number;
  type: DeviceType;
  name: string;
  rating: string;
  status: DeviceStatus;
  manufacturer?: string;
  confidence?: number;
  position?: number;
  modules?: number;
  catalogId?: string;
  /** Manufacturer SKU (IEK Article and the same field for other brands). */
  article?: string;
  /** Official product photo (transparent PNG when available). */
  imageUrl?: string;
  poles?: string;
  series?: string;
  model?: string;
  characteristics?: Record<string, string>;
  /** User-assigned room/line label after identification */
  circuitLabel?: string;
  brandKey?: string;
  /** Which DIN rail row this device is on (0-based, default 0) */
  rail?: number;
  /** @deprecated Devices are always shown ON on the scheme. */
  powered?: boolean;
  /** Icon id for the printable DIN-rail sticker */
  stickerIcon?: string;
}

/** One screw terminal on a DIN module face (top or bottom row). */
export type TerminalRef = {
  deviceId: number;
  side: "top" | "bottom";
  /** 0-based module index within the device */
  index: number;
};

/** User-drawn cable between two terminals on the panel scheme. */
export type PanelWire = {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  /** CSS color / hex for the insulation */
  color: string;
  /** Cross-section in mm² */
  thicknessMm: number;
  /** Cable construction / mark, e.g. ВВГнг-LS */
  cableType?: string;
};

export type ObjectType = "apartment" | "house" | "garage" | "dacha";

/** Major household electrical appliance attached to a home (panel object). */
export type HomeApplianceKind =
  | "fridge"
  | "washer"
  | "dishwasher"
  | "oven"
  | "hob"
  | "dryer"
  | "ac"
  | "boiler"
  | "microwave"
  | "tv"
  | "heater"
  | "coffee_maker"
  | "kettle"
  | "toaster"
  | "blender_mixer"
  | "food_processor"
  | "vacuum"
  | "robot_vacuum"
  | "iron"
  | "hood"
  | "air_fryer"
  | "grill"
  | "juicer"
  | "bread_maker"
  | "ice_maker"
  | "steamer"
  | "multicooker"
  | "wine_cooler"
  | "water_dispenser"
  | "humidifier"
  | "fan"
  | "pump"
  | "sauna"
  | "sewing_machine"
  | "hair_dryer"
  | "steam_mop"
  | "steam_cleaner"
  | "electric_shaver"
  | "electric_toothbrush"
  | "projector"
  | "soundbar"
  | "home_theater"
  | "router"
  | "smart_speaker"
  | "electric_fireplace"
  | "electric_blanket"
  | "towel_warmer"
  | "chest_freezer"
  | "minibar"
  | "waffle_maker"
  | "yogurt_maker"
  | "electric_knife"
  | "meat_slicer"
  | "garbage_disposal"
  | "warming_drawer"
  | "baby_food_maker"
  | "scale"
  | "massager"
  | "other";

export type ApplianceManual = {
  title: string;
  /** Absolute URL to a PDF / docs page (opened externally, not stored in our DB) */
  url: string;
};

export type ApplianceSpec = {
  label: string;
  value: string;
};

export interface HomeAppliance {
  id: string;
  kind: HomeApplianceKind;
  title: string;
  /** Rated / max power in watts */
  powerW?: number;
  brand?: string;
  model?: string;
  /** Manufacturer logo URL from Icecat — snapshotted at save time */
  brandLogoUrl?: string;
  /** Product photo URL from Icecat — snapshotted at save time */
  productImageUrl?: string;
  /** Catalog entry id when picked from the appliance database */
  catalogId?: string;
  photoDataUrl?: string;
  /** BYTEA rows in appliance_passport_photos (Amvera). Not image payloads. */
  passportPhotoIds?: string[];
  /** User labels for passport photos/files, keyed by photo id */
  passportPhotoTitles?: Record<string, string>;
  /** Spec rows (power, capacity, …) — snapshot from catalog at save time */
  specs?: ApplianceSpec[];
  manuals?: ApplianceManual[];
  createdAt: string;
}

export interface PanelObject {
  kind: "panel";
  id: string;
  type: ObjectType;
  title: string;
  address: string;
  lastCheck: string;
  breakers: number;
  /** Stage 2 score with home loads on lines (null until loads stage is ready) */
  safety: number | null;
  /** Stage 3 score from electrician inspection */
  professionalSafety?: number | null;
  devices?: Device[];
  linesCount?: number;
  photoDataUrl?: string;
  named?: boolean;
  /** Number of DIN rails (rows) in the panel, 1–4 */
  railCount?: number;
  /** User wiring between device terminals */
  wires?: PanelWire[];
  /** Declared supply phases for safety assessment */
  phases?: "1" | "3";
  /** Declared allocated power in kW */
  powerKw?: string;
  /** Whether the supply has a PE / earth conductor */
  hasGround?: boolean;
  /** Share token this copy was saved from, if any */
  sourceShareToken?: string;
  /** Major appliances in this home / apartment */
  appliances?: HomeAppliance[];
  /** ISO timestamp of last appliances list write — used for cross-device sync */
  appliancesUpdatedAt?: string;
  /** Dwelling address + year / kapremont snapshot for this panel */
  houseSnapshot?: PanelHouseSnapshot;
  /** ISO timestamp for stable list ordering */
  createdAt?: string;
  /** ISO timestamp of last title rename — protects against stale sync overwrites */
  titleUpdatedAt?: string;
  /** ISO timestamp of last scheme (devices / rails / wires) write */
  schemeUpdatedAt?: string;
  /** Setup without a photographed щиток (пробки, этажный щит, …) */
  noPanelSetupId?: NoPanelSetupId;
}

export type InstallRequestStatus =
  | "new"
  | "payment"
  | "in_progress"
  | "done"
  | "cancelled"
  | "deleted";

export type AiConsultationRecord = {
  category: "electrical" | "appliance_repair";
  topicLabel: string;
  problemLabel: string;
  customProblem?: string;
  aiReply: string;
  panelId?: string;
  panelTitle?: string;
};

export interface InstallRequest {
  kind: "install_request";
  id: string;
  title: string;
  subtitle: string;
  status: InstallRequestStatus;
  statusLabel: string;
  createdAt: string;
  city: string;
  contactMethod: "phone" | "telegram";
  phone?: string;
  name: string;
  dwelling?: "apartment" | "house";
  phases?: "1" | "3";
  powerKw?: string;
  setupTitle?: string;
  exactAddress?: string;
  publicCode?: string;
  paymentStatus?: "pending" | "confirmed" | "failed";
  paidAmountRub?: number;
  tbankPaymentId?: string;
  /** Telegram ID of the master who accepted this request */
  masterTelegramId?: number;
  /** Panel ID linked to this request (if sent from scheme screen) */
  panelId?: string;
  /** When master accepted the request */
  masterAcceptedAt?: string;
  /** When the user paid after master acceptance */
  paidAt?: string;
  /** When the request was dispatched to masters */
  dispatchedAt?: string;
  /** Customer should review master wiring + rate on next open */
  wiringReviewPending?: boolean;
  /** Linked consultation request shown under a master visit card */
  linkedRequestId?: string;
  /** Saved AI consultation payload for consultation requests */
  aiConsultation?: AiConsultationRecord;
}

export function isAiConsultationRequest(request: InstallRequest): boolean {
  return Boolean(request.aiConsultation);
}

/** Consultation-only card (C-*), not yet converted to a master visit. */
export function isStandaloneAiConsultation(request: InstallRequest): boolean {
  return (
    Boolean(request.aiConsultation) &&
    request.publicCode?.startsWith("C-") === true
  );
}

export type HomeListItem = PanelObject | InstallRequest;

export type AppScreen =
  | "welcome"
  | "objects"
  | "photo"
  | "analysis"
  | "scheme"
  | "no-panel-options"
  | "no-panel-detail"
  | "panel-advantages"
  | "electrical-details"
  | "city-select"
  | "geo-address"
  | "address-select"
  | "house-insight"
  | "lead-service"
  | "lead-contact"
  | "request-type"
  | "request-details"
  | "about-service"
  | "school"
  | "panel-game"
  | "profile"
  | "electrical-rules"
  | "electrical-rule-detail"
  | "become-master"
  | "master-docs"
  | "master-exam"
  | "master-about"
  | "feedback"
  | "telegram-auth"
  | "master-search"
  | "master-success"
  | "master-not-found"
  | "admin"
  | "appliance-detail"
  | "research-survey"
  | "maintenance"
  | "wiring-check-quote";

export type LeadFlow = "install" | "master";

export interface AnalyzePanelResult {
  devices: Device[];
  safetyScore: number;
  linesCount: number;
  railCount?: number;
}

export const installStatusLabels: Record<InstallRequestStatus, string> = {
  new: "Новая",
  payment: "Оплата",
  in_progress: "В работе",
  done: "Выполнено",
  cancelled: "Отменена",
  deleted: "Удален",
};

export const installStatusSteps: Array<{
  id: Exclude<InstallRequestStatus, "cancelled" | "deleted">;
  label: string;
}> = [
  { id: "new", label: "Новая" },
  { id: "payment", label: "Оплата" },
  { id: "in_progress", label: "В работе" },
  { id: "done", label: "Выполнено" },
];

export function installStatusProgress(status: InstallRequestStatus): number {
  if (status === "new") return 25;
  if (status === "payment") return 50;
  if (status === "in_progress") return 75;
  if (status === "done") return 100;
  return 0;
}

export function installStatusTone(status: InstallRequestStatus): {
  badge: string;
  bar: string;
  dot: string;
  ring: string;
} {
  if (status === "done") {
    return {
      badge: "bg-emerald-500/15 text-emerald-700",
      bar: "bg-emerald-500",
      dot: "bg-emerald-500",
      ring: "ring-emerald-500/35",
    };
  }
  if (status === "in_progress") {
    return {
      badge: "bg-sky-500/15 text-sky-800",
      bar: "bg-sky-500",
      dot: "bg-sky-500",
      ring: "ring-sky-500/35",
    };
  }
  if (status === "payment") {
    return {
      badge: "bg-amber-400/20 text-amber-800",
      bar: "bg-amber-400",
      dot: "bg-amber-400",
      ring: "ring-amber-400/40",
    };
  }
  if (status === "cancelled" || status === "deleted") {
    return {
      badge: "bg-zinc-100 text-zinc-500",
      bar: "bg-zinc-400",
      dot: "bg-zinc-400",
      ring: "ring-zinc-300",
    };
  }
  return {
    badge: "bg-rose-500/15 text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    ring: "ring-rose-500/35",
  };
}
