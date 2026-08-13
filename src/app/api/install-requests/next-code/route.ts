import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  allocateRequestPublicCode,
  dbErrorResponse,
  ensureSchema,
  upsertUser,
} from "@/lib/db";
import {
  isRequestTypeCode,
  type RequestTypeCode,
} from "@/lib/request-codes";

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as { typeCode?: string };
    const typeCode = body.typeCode;
    if (!typeCode || !isRequestTypeCode(typeCode)) {
      return Response.json({ error: "Некорректный тип заявки" }, { status: 400 });
    }

    const publicCode = await allocateRequestPublicCode(typeCode as RequestTypeCode);
    return Response.json({ publicCode });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
