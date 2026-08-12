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
  poles?: string;
  series?: string;
  model?: string;
  characteristics?: Record<string, string>;
  /** User-assigned room/line label after identification */
  circuitLabel?: string;
  brandKey?: string;
  /** Which DIN rail row this device is on (0-based, default 0) */
  rail?: number;
}

export type ObjectType = "apartment" | "house" | "garage" | "dacha";

export interface PanelObject {
  kind: "panel";
  id: string;
  type: ObjectType;
  title: string;
  address: string;
  lastCheck: string;
  breakers: number;
  safety: number;
  devices?: Device[];
  linesCount?: number;
  photoDataUrl?: string;
  /** Small JPEG data URL for home list (~112px). */
  photoThumbDataUrl?: string;
  named?: boolean;
  /** Number of DIN rails (rows) in the panel, 1–4 */
  railCount?: number;
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
  | "lead-contact"
  | "request-details"
  | "about-service"
  | "electrical-rules"
  | "electrical-rule-detail"
  | "become-master"
  | "telegram-auth";

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
