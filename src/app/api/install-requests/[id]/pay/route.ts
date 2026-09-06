import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { MASTER_VISIT_MIN_PRICE_RUB } from "@/lib/lead-services";
import { resolveInstallRequestVisitAmountRub } from "@/lib/install-request-accept";
import {
  dbErrorResponse,
  ensureSchema,
  getInstallRequestById,
  markInstallRequestPaid,
  upsertUser,
} from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      amountRub?: number;
      tbankPaymentId?: string;
    };
    let amountRub =
      typeof body.amountRub === "number" && body.amountRub > 0
        ? body.amountRub
        : null;
    if (amountRub == null) {
      const existing = await getInstallRequestById(id);
      amountRub = existing
        ? await resolveInstallRequestVisitAmountRub(existing)
        : MASTER_VISIT_MIN_PRICE_RUB;
    }

    const item = await markInstallRequestPaid(
      user.telegramId,
      id,
      amountRub,
      body.tbankPaymentId ?? null,
    );
    if (!item) {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    return Response.json({ request: item });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
