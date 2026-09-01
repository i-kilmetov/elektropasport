import { randomBytes } from "crypto";
import {
  AuthError,
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { resolveAppOrigin } from "@/lib/app-url";
import {
  dbErrorResponse,
  ensureSchema,
  getPendingSbpPaymentByService,
  getSchoolPaidGrades,
  getSchoolPromoByCode,
  hasSchoolPromoRedemption,
  insertSbpPayment,
  updateSbpPayment,
  upsertUser,
} from "@/lib/db";
import {
  isGradeId,
  SCHOOL_GRADE_PAYMENT_TITLE,
  SCHOOL_GRADE_PRICE_RUB,
  schoolServiceType,
} from "@/lib/school/access";
import {
  computePromoAmounts,
  normalizePromoCode,
  parseSchoolPaymentLeadPayload,
  schoolLeadPromoCode,
  validateSchoolPromo,
  type SchoolPaymentLeadPayload,
} from "@/lib/school/promo";
import { fulfillConfirmedSbpPayment, refreshSbpPaymentFromBank } from "@/lib/sbp-fulfill";
import {
  buildRobokassaPaymentUrl,
  isRobokassaConfigured,
  newRobokassaInvId,
} from "@/lib/robokassa";

function newOrderId(): string {
  return `s${Date.now().toString(36)}${randomBytes(6).toString("hex")}`.slice(
    0,
    36,
  );
}

function paymentJson(payment: {
  id: string;
  amountRub: number;
  status: string;
  qrPayload: string | null;
  qrImage: string | null;
  tbankPaymentId: string | null;
  originalAmountRub?: number;
  discountRub?: number;
  promoCode?: string | null;
}) {
  return {
    id: payment.id,
    amountRub: payment.amountRub,
    status: payment.status,
    qrPayload: payment.qrPayload,
    qrImage: payment.qrImage,
    tbankPaymentId: payment.tbankPaymentId,
    originalAmountRub: payment.originalAmountRub,
    discountRub: payment.discountRub,
    promoCode: payment.promoCode,
  };
}

function leadPayloadExtras(
  payload: SchoolPaymentLeadPayload,
): Pick<
  ReturnType<typeof paymentJson>,
  "originalAmountRub" | "discountRub" | "promoCode"
> {
  return {
    originalAmountRub: payload.originalAmountRub,
    discountRub: payload.discountRub,
    promoCode: payload.promoCode ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as {
      gradeId?: unknown;
      promoCode?: unknown;
    };
    const gradeId = body.gradeId;
    if (!isGradeId(gradeId)) {
      return Response.json({ error: "Некорректный класс" }, { status: 400 });
    }

    const paid = await getSchoolPaidGrades(user.telegramId);
    if (paid.includes(gradeId)) {
      return Response.json(
        { error: "Этот класс уже оплачен", paidGrades: paid },
        { status: 409 },
      );
    }

    const originalAmountRub = SCHOOL_GRADE_PRICE_RUB[gradeId];
    const requestedPromoCode = normalizePromoCode(String(body.promoCode ?? ""));

    let promo:
      | Awaited<ReturnType<typeof getSchoolPromoByCode>>
      | null = null;
    let discountRub = 0;
    let finalAmountRub = originalAmountRub;

    if (requestedPromoCode) {
      promo = await getSchoolPromoByCode(requestedPromoCode);
      if (!promo) {
        return Response.json({ error: "Промокод не найден" }, { status: 400 });
      }
      const alreadyRedeemed = await hasSchoolPromoRedemption({
        promoCodeId: promo.id,
        telegramUserId: user.telegramId,
        gradeId,
      });
      const validation = validateSchoolPromo({
        promo,
        gradeId,
        alreadyRedeemed,
      });
      if (!validation.ok) {
        return Response.json({ error: validation.error }, { status: 400 });
      }
      discountRub = validation.preview.discountRub;
      finalAmountRub = validation.preview.finalAmountRub;
    }

    if (finalAmountRub > 0 && !isRobokassaConfigured()) {
      return Response.json(
        { error: "Оплата обучения пока не настроена" },
        { status: 503 },
      );
    }

    const serviceType = schoolServiceType(gradeId);
    const existing = await getPendingSbpPaymentByService(
      user.telegramId,
      serviceType,
    );
    if (existing) {
      const existingPromo = schoolLeadPromoCode(existing.leadPayload);
      const existingPayload = parseSchoolPaymentLeadPayload(existing.leadPayload);
      const samePromo = (existingPromo ?? "") === requestedPromoCode;
      const sameAmount = existing.amountRub === finalAmountRub;

      if (samePromo && sameAmount) {
        let current = existing;
        try {
          current = await refreshSbpPaymentFromBank(existing);
        } catch (error) {
          console.error("Failed to refresh school payment", error);
        }
        if (current.status === "confirmed" || current.status === "pending") {
          return Response.json(
            paymentJson({
              ...current,
              ...(existingPayload ? leadPayloadExtras(existingPayload) : {}),
            }),
          );
        }
      } else {
        await updateSbpPayment(existing.id, { status: "failed" });
      }
    }

    const title = SCHOOL_GRADE_PAYMENT_TITLE[gradeId];
    const orderId = newOrderId();
    const leadPayload: SchoolPaymentLeadPayload = {
      kind: "school",
      gradeId,
      ...(promo
        ? {
            promoCodeId: promo.id,
            promoCode: promo.code,
            originalAmountRub,
            discountRub,
          }
        : {}),
    };

    if (finalAmountRub <= 0) {
      const payment = await insertSbpPayment({
        id: orderId,
        telegramUserId: user.telegramId,
        orderId,
        tbankPaymentId: null,
        serviceType,
        amountRub: 0,
        status: "pending",
        qrPayload: null,
        qrImage: null,
        leadPayload,
        requestId: null,
      });
      const confirmed = await fulfillConfirmedSbpPayment(payment);
      return Response.json(
        paymentJson({
          ...confirmed,
          ...leadPayloadExtras(leadPayload),
        }),
        { status: 201 },
      );
    }

    const invId = newRobokassaInvId();
    const origin = resolveAppOrigin(request);
    const paymentUrl = buildRobokassaPaymentUrl({
      invId,
      amountRub: finalAmountRub,
      description:
        promo && discountRub > 0
          ? `Школа Током — ${title} (промокод ${promo.code})`
          : `Школа Током — ${title}`,
      successUrl: `${origin}/school`,
      failUrl: `${origin}/school`,
      shp: {
        kind: "school",
        order_id: orderId,
        grade_id: String(gradeId),
        ...(promo ? { promo_code: promo.code } : {}),
      },
    });

    const payment = await insertSbpPayment({
      id: orderId,
      telegramUserId: user.telegramId,
      orderId,
      tbankPaymentId: String(invId),
      serviceType,
      amountRub: finalAmountRub,
      status: "pending",
      qrPayload: paymentUrl,
      qrImage: null,
      leadPayload,
      requestId: null,
    });

    return Response.json(
      paymentJson({
        ...payment,
        ...leadPayloadExtras(leadPayload),
      }),
      { status: 201 },
    );
  } catch (error) {
    const db = dbErrorResponse(error);
    if (db) return db;
    if (error instanceof AuthError) return authErrorResponse(error);
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    return authErrorResponse(error);
  }
}
