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
  insertSbpPayment,
  upsertUser,
} from "@/lib/db";
import {
  isGradeId,
  SCHOOL_GRADE_PAYMENT_TITLE,
  SCHOOL_GRADE_PRICE_RUB,
  schoolServiceType,
} from "@/lib/school/access";
import { refreshSbpPaymentFromBank } from "@/lib/sbp-fulfill";
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
}) {
  return {
    id: payment.id,
    amountRub: payment.amountRub,
    status: payment.status,
    qrPayload: payment.qrPayload,
    qrImage: payment.qrImage,
    tbankPaymentId: payment.tbankPaymentId,
  };
}

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    if (!isRobokassaConfigured()) {
      return Response.json(
        { error: "Оплата обучения пока не настроена" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { gradeId?: unknown };
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

    const serviceType = schoolServiceType(gradeId);
    const existing = await getPendingSbpPaymentByService(
      user.telegramId,
      serviceType,
    );
    if (existing) {
      let current = existing;
      try {
        current = await refreshSbpPaymentFromBank(existing);
      } catch (error) {
        console.error("Failed to refresh school payment", error);
      }
      if (current.status === "confirmed" || current.status === "pending") {
        return Response.json(paymentJson(current));
      }
    }

    const amountRub = SCHOOL_GRADE_PRICE_RUB[gradeId];
    const title = SCHOOL_GRADE_PAYMENT_TITLE[gradeId];
    const orderId = newOrderId();
    const invId = newRobokassaInvId();
    const origin = resolveAppOrigin(request);
    const paymentUrl = buildRobokassaPaymentUrl({
      invId,
      amountRub,
      description: `Школа Током — ${title}`,
      successUrl: `${origin}/school`,
      failUrl: `${origin}/school`,
      shp: {
        kind: "school",
        order_id: orderId,
        grade_id: String(gradeId),
      },
    });

    const payment = await insertSbpPayment({
      id: orderId,
      telegramUserId: user.telegramId,
      orderId,
      tbankPaymentId: String(invId),
      serviceType,
      amountRub,
      status: "pending",
      qrPayload: paymentUrl,
      qrImage: null,
      leadPayload: { kind: "school", gradeId },
      requestId: null,
    });

    return Response.json(paymentJson(payment), { status: 201 });
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
