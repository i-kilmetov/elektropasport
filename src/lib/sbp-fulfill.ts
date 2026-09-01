import { randomBytes } from "crypto";
import type { PendingInstallLead } from "@/lib/pending-lead";
import {
  addSchoolPaidGrade,
  getSbpPaymentByTbankId,
  hasSchoolPromoRedemption,
  insertInstallRequest,
  recordSchoolPromoRedemption,
  updateSbpPayment,
  type SbpPaymentRecord,
} from "@/lib/db";
import { installRequestFromLead } from "@/lib/install-request";
import {
  parseSchoolGradeId,
  SCHOOL_GRADE_PAYMENT_TITLE,
} from "@/lib/school/access";
import {
  computePromoAmounts,
  parseSchoolPaymentLeadPayload,
} from "@/lib/school/promo";
import { notifyAdminNewInstallRequest, notifyAdminSchoolPurchase } from "@/lib/telegram-notify";

function newRedemptionId(): string {
  return `redeem-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
}

async function maybeRecordSchoolPromoRedemption(
  payment: SbpPaymentRecord,
): Promise<void> {
  const payload = parseSchoolPaymentLeadPayload(payment.leadPayload);
  if (!payload?.promoCodeId) return;

  const already = await hasSchoolPromoRedemption({
    promoCodeId: payload.promoCodeId,
    telegramUserId: payment.telegramUserId,
    gradeId: payload.gradeId,
  });
  if (already) return;

  const originalAmountRub =
    payload.originalAmountRub ??
    payment.amountRub + (payload.discountRub ?? 0);
  const discountRub =
    payload.discountRub ??
    computePromoAmounts(originalAmountRub, {
      discountType: "fixed",
      discountValue: originalAmountRub - payment.amountRub,
    }).discountRub;

  await recordSchoolPromoRedemption({
    id: newRedemptionId(),
    promoCodeId: payload.promoCodeId,
    telegramUserId: payment.telegramUserId,
    gradeId: payload.gradeId,
    paymentId: payment.id,
    originalAmountRub,
    discountRub,
    finalAmountRub: payment.amountRub,
  });
}

/** Robokassa confirms via Result URL; polling only reads the DB row. */
export async function refreshSbpPaymentFromBank(
  payment: SbpPaymentRecord,
): Promise<SbpPaymentRecord> {
  return payment;
}

export async function fulfillConfirmedSbpPayment(
  payment: SbpPaymentRecord,
): Promise<SbpPaymentRecord> {
  const gradeId = parseSchoolGradeId(payment.serviceType);
  if (gradeId) {
    await addSchoolPaidGrade(payment.telegramUserId, gradeId);
    if (payment.status === "confirmed") return payment;
    const next =
      (await updateSbpPayment(payment.id, { status: "confirmed" })) ?? {
        ...payment,
        status: "confirmed" as const,
      };
    try {
      await maybeRecordSchoolPromoRedemption(next);
    } catch (error) {
      console.error("Failed to record school promo redemption", error);
    }
    try {
      await notifyAdminSchoolPurchase({
        telegramUserId: payment.telegramUserId,
        gradeId,
        gradeTitle: SCHOOL_GRADE_PAYMENT_TITLE[gradeId],
        amountRub: payment.amountRub,
        orderId: payment.orderId,
      });
    } catch (error) {
      console.error("Failed to notify admin about school payment", error);
    }
    return next;
  }

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
