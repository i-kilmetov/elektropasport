export type DeviceType =
  | "main_breaker"
  | "rcd"
  | "diff_breaker"
  | "voltage_relay"
  | "breaker"
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
  named?: boolean;
}

export type InstallRequestStatus = "new" | "in_progress" | "done";

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
  | "become-master";

export type LeadFlow = "install" | "master";

export interface AnalyzePanelResult {
  devices: Device[];
  safetyScore: number;
  linesCount: number;
}

export const installStatusLabels: Record<InstallRequestStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  done: "Выполнена",
};
