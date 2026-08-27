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
  /** Catalog entry id when picked from the appliance database */
  catalogId?: string;
  photoDataUrl?: string;
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
  /** null / omitted until user provides phases + power and score is computed */
  safety: number | null;
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
  | "in_progress"
  | "done"
  | "cancelled";

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
  /** When the request was dispatched to masters */
  dispatchedAt?: string;
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
  | "research-survey";

export type LeadFlow = "install" | "master";

export interface AnalyzePanelResult {
  devices: Device[];
  safetyScore: number;
  linesCount: number;
  railCount?: number;
}

export const installStatusLabels: Record<InstallRequestStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Выполнено",
  cancelled: "Отменена",
};

export const installStatusSteps: Array<{
  id: Exclude<InstallRequestStatus, "cancelled">;
  label: string;
}> = [
  { id: "new", label: "Новая" },
  { id: "in_progress", label: "В работе" },
  { id: "done", label: "Выполнено" },
];

export function installStatusProgress(status: InstallRequestStatus): number {
  if (status === "new") return 33;
  if (status === "in_progress") return 66;
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
      badge: "bg-amber-400/20 text-amber-800",
      bar: "bg-amber-400",
      dot: "bg-amber-400",
      ring: "ring-amber-400/40",
    };
  }
  if (status === "cancelled") {
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
