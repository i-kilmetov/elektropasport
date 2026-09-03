import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  markInstallRequestPaid,
  upsertUser,
} from "@/lib/db";
import { MASTER_HOME_VISIT_PRICE_RUB } from "@/lib/lead-services";

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
    const amountRub =
      typeof body.amountRub === "number" && body.amountRub > 0
        ? body.amountRub
        : MASTER_HOME_VISIT_PRICE_RUB;

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
