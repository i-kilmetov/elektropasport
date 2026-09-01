import {
  AuthError,
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getSchoolPromoByCode,
  hasSchoolPromoRedemption,
  upsertUser,
} from "@/lib/db";
import { isGradeId, SCHOOL_GRADE_PRICE_RUB } from "@/lib/school/access";
import {
  normalizePromoCode,
  validateSchoolPromo,
} from "@/lib/school/promo";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as {
      code?: unknown;
      gradeId?: unknown;
    };
    const gradeId = body.gradeId;
    if (!isGradeId(gradeId)) {
      return Response.json({ error: "Некорректный класс" }, { status: 400 });
    }

    const code = normalizePromoCode(String(body.code ?? ""));
    if (!code) {
      return Response.json({ error: "Введите промокод" }, { status: 400 });
    }

    const promo = await getSchoolPromoByCode(code);
    if (!promo) {
      return Response.json({ error: "Промокод не найден" }, { status: 404 });
    }

    const alreadyRedeemed = await hasSchoolPromoRedemption({
      promoCodeId: promo.id,
      telegramUserId: user.telegramId,
      gradeId,
    });
    const result = validateSchoolPromo({
      promo,
      gradeId,
      alreadyRedeemed,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      preview: result.preview,
      originalAmountRub: SCHOOL_GRADE_PRICE_RUB[gradeId],
    });
  } catch (error) {
    const db = dbErrorResponse(error);
    if (db) return db;
    if (error instanceof AuthError) return authErrorResponse(error);
    return authErrorResponse(error);
  }
}
