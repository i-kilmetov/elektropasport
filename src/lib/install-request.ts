import type { PendingInstallLead } from "@/lib/pending-lead";
import type { InstallRequest } from "@/types";
import { installStatusLabels } from "@/types";

export function installRequestFromLead(
  payload: PendingInstallLead,
  extras?: {
    city?: string;
    exactAddress?: string;
    paymentStatus?: InstallRequest["paymentStatus"];
    paidAmountRub?: number;
    tbankPaymentId?: string;
  },
): InstallRequest {
  return {
    kind: "install_request",
    id: payload.id,
    title: payload.publicCode ?? "Заявка",
    subtitle: payload.setupTitle
      ? `Заявка: ${payload.setupTitle}`
      : "Заявка на установку щитка",
    publicCode: payload.publicCode,
    status: "new",
    statusLabel: installStatusLabels.new,
    createdAt: new Date().toLocaleDateString("ru-RU"),
    city: extras?.city?.trim() || payload.city?.trim() || "—",
    contactMethod: payload.contactMethod,
    phone: payload.phone,
    name: payload.name,
    dwelling: payload.dwelling,
    phases: payload.phases,
    powerKw: payload.powerKw,
    setupTitle: payload.setupTitle,
    exactAddress:
      extras?.exactAddress?.trim() || payload.exactAddress || undefined,
    paymentStatus: extras?.paymentStatus ?? payload.paymentStatus,
    paidAmountRub: extras?.paidAmountRub ?? payload.paidAmountRub,
    tbankPaymentId: extras?.tbankPaymentId ?? payload.tbankPaymentId,
  };
}
