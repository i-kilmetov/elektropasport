import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  getStoredUserProfile,
  updateStoredUserProfile,
  upsertUser,
  type StoredUserProfile,
} from "@/lib/db";

function normalizeProfile(body: {
  displayName?: unknown;
  birthDate?: unknown;
  gender?: unknown;
  phoneDigits?: unknown;
  avatarId?: unknown;
}): StoredUserProfile {
  const gender =
    body.gender === "male" ||
    body.gender === "female" ||
    body.gender === "unspecified"
      ? body.gender
      : undefined;

  return {
    displayName:
      typeof body.displayName === "string"
        ? body.displayName.trim() || undefined
        : undefined,
    birthDate:
      typeof body.birthDate === "string" ? body.birthDate.trim() || undefined : undefined,
    gender,
    phoneDigits:
      typeof body.phoneDigits === "string"
        ? body.phoneDigits.replace(/\D/g, "").slice(0, 10) || undefined
        : undefined,
    avatarId:
      typeof body.avatarId === "string"
        ? body.avatarId.trim() || undefined
        : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);
    const profile = await getStoredUserProfile(user.telegramId);
    return Response.json({ profile });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as Record<string, unknown>;
    const profile = await updateStoredUserProfile(
      user.telegramId,
      normalizeProfile(body),
    );

    return Response.json({ profile });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
