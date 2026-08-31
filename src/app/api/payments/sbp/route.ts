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
  insertSbpPayment,
  upsertUser,
} from "@/lib/db";
import { payableAmountRub, getLeadServiceLabel } from "@/lib/lead-services";
import type { PendingInstallLead } from "@/lib/pending-lead";
import {
  buildRobokassaPaymentUrl,
  isRobokassaConfigured,
  newRobokassaInvId,
} from "@/lib/robokassa";

function newOrderId(): string {
  return `p${Date.now().toString(36)}${randomBytes(6).toString("hex")}`.slice(
    0,
    36,
  );
}

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    if (!isRobokassaConfigured()) {
      return Response.json(
        { error: "Оплата по СБП пока не настроена" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { lead?: PendingInstallLead };
    const lead = body.lead;
    if (!lead?.id || !lead.phone || !lead.name || !lead.serviceType) {
      return Response.json({ error: "Некорректные данные заявки" }, { status: 400 });
    }

    const amountRub = payableAmountRub({
      serviceType: lead.serviceType,
      panelModules: lead.panelModules,
    });
    if (!amountRub) {
      return Response.json(
        { error: "Для этой услуги сумма не фиксирована — оплата не нужна" },
        { status: 400 },
      );
    }

    const orderId = newOrderId();
    const invId = newRobokassaInvId();
    const description = getLeadServiceLabel(lead.serviceType);
    const origin = resolveAppOrigin(request);
    const paymentUrl = buildRobokassaPaymentUrl({
      invId,
      amountRub,
      description,
      successUrl: `${origin}/`,
      failUrl: `${origin}/`,
      shp: {
        kind: "lead",
        order_id: orderId,
        request_id: lead.id,
      },
    });

    const payment = await insertSbpPayment({
      id: orderId,
      telegramUserId: user.telegramId,
      orderId,
      tbankPaymentId: String(invId),
      serviceType: lead.serviceType,
      amountRub,
      status: "pending",
      qrPayload: paymentUrl,
      qrImage: null,
      leadPayload: {
        ...lead,
        paymentOrderId: orderId,
        tbankPaymentId: String(invId),
        paidAmountRub: amountRub,
        paymentStatus: "pending",
      },
      requestId: null,
    });

    return Response.json(
      {
        id: payment.id,
        amountRub: payment.amountRub,
        status: payment.status,
        qrPayload: payment.qrPayload,
        qrImage: payment.qrImage,
        tbankPaymentId: payment.tbankPaymentId,
      },
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
