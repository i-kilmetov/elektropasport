import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getMasterProfile,
  getUserRole,
  upsertUser,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const role = await getUserRole(user.telegramId);
    if (role !== "master") {
      return Response.json({ role: "user", isMaster: false });
    }

    const profile = await getMasterProfile(user.telegramId);
    return Response.json({
      role: "master",
      isMaster: true,
      profile,
    });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
