import type { PendingInstallLead } from "@/lib/pending-lead";
import {
  getSbpPaymentByTbankId,
  insertInstallRequest,
  updateSbpPayment,
  type SbpPaymentRecord,
} from "@/lib/db";
import { installRequestFromLead } from "@/lib/install-request";
import { notifyAdminNewInstallRequest } from "@/lib/telegram-notify";
import { mapYooKassaStatus, yooKassaGetPayment } from "@/lib/yookassa";

export async function refreshSbpPaymentFromBank(
  payment: SbpPaymentRecord,
): Promise<SbpPaymentRecord> {
  if (payment.status !== "pending" || !payment.tbankPaymentId) {
    return payment;
  }
  const remote = await yooKassaGetPayment(payment.tbankPaymentId);
  const next = mapYooKassaStatus(remote.status, remote.paid);
  if (next === "pending") return payment;
  if (next === "failed") {
    return (
      (await updateSbpPayment(payment.id, { status: "failed" })) ?? {
        ...payment,
        status: "failed",
      }
    );
  }
  return fulfillConfirmedSbpPayment(payment);
}

export async function fulfillConfirmedSbpPayment(
  payment: SbpPaymentRecord,
): Promise<SbpPaymentRecord> {
  if (payment.status === "confirmed" && payment.requestId) {
    return payment;
  }

  const lead = payment.leadPayload as PendingInstallLead | null;
  if (lead?.id && lead.phone && lead.name) {
    const request = installRequestFromLead(lead, {
      paymentStatus: "confirmed",
      paidAmountRub: payment.amountRub,
      tbankPaymentId: payment.tbankPaymentId ?? undefined,
    });
    const { created } = await insertInstallRequest(
      payment.telegramUserId,
      request,
    );
    if (created) {
      try {
        await notifyAdminNewInstallRequest(request, payment.telegramUserId);
      } catch (error) {
        console.error("Failed to notify admin about paid request", error);
      }
    }
    return (
      (await updateSbpPayment(payment.id, {
        status: "confirmed",
        requestId: request.id,
      })) ?? { ...payment, status: "confirmed", requestId: request.id }
    );
  }

  return (
    (await updateSbpPayment(payment.id, { status: "confirmed" })) ?? {
      ...payment,
      status: "confirmed",
    }
  );
}

export async function fulfillSbpByTbankPaymentId(
  tbankPaymentId: string,
): Promise<SbpPaymentRecord | null> {
  const payment = await getSbpPaymentByTbankId(tbankPaymentId);
  if (!payment) return null;
  return fulfillConfirmedSbpPayment(payment);
}
