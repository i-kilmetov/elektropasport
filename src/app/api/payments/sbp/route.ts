import { randomBytes } from "crypto";
import {
  AuthError,
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  insertSbpPayment,
  upsertUser,
} from "@/lib/db";
import { payableAmountRub, getLeadServiceLabel } from "@/lib/lead-services";
import type { PendingInstallLead } from "@/lib/pending-lead";
import {
  isTBankConfigured,
  tbankGetQr,
  tbankInit,
  tbankNotificationUrl,
} from "@/lib/tbank";

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

    if (!isTBankConfigured()) {
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
    const description = getLeadServiceLabel(lead.serviceType);
    const init = await tbankInit({
      orderId,
      amountKopecks: amountRub * 100,
      description,
      notificationUrl: tbankNotificationUrl(),
      phone: lead.phone,
    });
    const qr = await tbankGetQr(init.paymentId);

    const payment = await insertSbpPayment({
      id: orderId,
      telegramUserId: user.telegramId,
      orderId,
      tbankPaymentId: init.paymentId,
      serviceType: lead.serviceType,
      amountRub,
      status: "pending",
      qrPayload: qr.payload,
      qrImage: qr.image ?? null,
      leadPayload: {
        ...lead,
        paymentOrderId: orderId,
        tbankPaymentId: init.paymentId,
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
