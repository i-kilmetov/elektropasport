import type { ElectricalDetails } from "@/components/screens/electrical-details-screen";
import type { LeadServiceType } from "@/lib/lead-services";

export const PENDING_INSTALL_LEAD_KEY = "ep_pending_install_lead";

export type PendingInstallLead = {
  id: string;
  contactMethod: "phone" | "telegram";
  phone: string;
  name: string;
  city?: string;
  serviceType?: LeadServiceType;
  estimatedPriceRub?: number | null;
  panelModules?: number;
  dwelling?: ElectricalDetails["dwelling"];
  phases?: ElectricalDetails["phases"];
  powerKw?: string;
  setupTitle?: string;
  publicCode?: string;
};

export function readPendingInstallLead(): PendingInstallLead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_INSTALL_LEAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingInstallLead;
    if (!parsed?.id || !parsed.phone || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingInstallLead(draft: PendingInstallLead): void {
  try {
    sessionStorage.setItem(PENDING_INSTALL_LEAD_KEY, JSON.stringify(draft));
  } catch {
    // Private mode / quota — in-memory ref still holds the draft.
  }
}

export function clearPendingInstallLead(): void {
  try {
    sessionStorage.removeItem(PENDING_INSTALL_LEAD_KEY);
  } catch {
    // ignore
  }
}
