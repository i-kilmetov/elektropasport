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
  getSbpPaymentById,
  getTokomPlusUntil,
  hasTokomPlus,
  insertSbpPayment,
  updateSbpPayment,
  upsertUser,
} from "@/lib/db";
import { refreshSbpPaymentFromBank } from "@/lib/sbp-fulfill";
import {
  buildRobokassaPaymentUrl,
  isRobokassaConfigured,
  newRobokassaInvId,
} from "@/lib/robokassa";
import {
  formatPlusUntil,
  isTokomPlusActive,
  TOKOM_PLUS_PRICE_RUB,
  TOKOM_PLUS_SERVICE_TYPE,
} from "@/lib/tokom-plus";

function newOrderId(): string {
  return `plus${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.slice(
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

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const until = await getTokomPlusUntil(user.telegramId);
    const active = isTokomPlusActive(until);
    return Response.json({
      active,
      until,
      untilLabel: formatPlusUntil(until),
      priceRub: TOKOM_PLUS_PRICE_RUB,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

/** Create (or reuse) a Robokassa payment for one month of Током Плюс. */
export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    if (!isRobokassaConfigured()) {
      return Response.json(
        { error: "Оплата подписки пока не настроена" },
        { status: 503 },
      );
    }

    const existing = await getPendingSbpPaymentByService(
      user.telegramId,
      TOKOM_PLUS_SERVICE_TYPE,
    );
    if (existing) {
      let current = existing;
      try {
        current = await refreshSbpPaymentFromBank(existing);
      } catch (error) {
        console.error("Failed to refresh plus payment", error);
      }
      if (
        current.status === "pending" &&
        current.amountRub === TOKOM_PLUS_PRICE_RUB &&
        current.qrPayload
      ) {
        return Response.json(paymentJson(current));
      }
      if (current.status === "confirmed") {
        return Response.json({
          ...paymentJson(current),
          active: await hasTokomPlus(user.telegramId),
          until: await getTokomPlusUntil(user.telegramId),
        });
      }
      await updateSbpPayment(existing.id, { status: "failed" });
    }

    const orderId = newOrderId();
    const invId = newRobokassaInvId();
    const origin = resolveAppOrigin(request);
    const paymentUrl = buildRobokassaPaymentUrl({
      invId,
      amountRub: TOKOM_PLUS_PRICE_RUB,
      description: "Током Плюс — заряженная подписка на 30 дней",
      successUrl: `${origin}/`,
      failUrl: `${origin}/`,
      shp: {
        kind: "plus",
        order_id: orderId,
      },
    });

    const payment = await insertSbpPayment({
      id: orderId,
      telegramUserId: user.telegramId,
      orderId,
      tbankPaymentId: String(invId),
      serviceType: TOKOM_PLUS_SERVICE_TYPE,
      amountRub: TOKOM_PLUS_PRICE_RUB,
      status: "pending",
      qrPayload: paymentUrl,
      qrImage: null,
      leadPayload: { kind: "tokom_plus" },
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

/** Poll payment status after returning from Robokassa. */
export async function PATCH(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json().catch(() => ({}))) as {
      paymentId?: unknown;
    };
    const paymentId =
      typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    if (!paymentId) {
      return Response.json({ error: "Нет paymentId" }, { status: 400 });
    }

    const payment = await getSbpPaymentById(paymentId);
    if (!payment || payment.telegramUserId !== user.telegramId) {
      return Response.json({ error: "Платёж не найден" }, { status: 404 });
    }

    const until = await getTokomPlusUntil(user.telegramId);
    return Response.json({
      ...paymentJson(payment),
      active: isTokomPlusActive(until),
      until,
      untilLabel: formatPlusUntil(until),
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
