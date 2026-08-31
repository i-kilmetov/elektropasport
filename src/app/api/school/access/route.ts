import { authErrorResponse, requireTelegramUser } from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getSchoolPaidGrades,
  upsertUser,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const paidGrades = await getSchoolPaidGrades(user.telegramId);
    return Response.json({ paidGrades });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
