import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  deleteUserAccount,
  ensureSchema,
  getStoredUserProfile,
  updateStoredUserProfile,
  upsertUser,
  type StoredUserProfile,
} from "@/lib/db";

function normalizeProfile(body: {
  firstName?: unknown;
  lastName?: unknown;
  displayName?: unknown;
  birthDate?: unknown;
  phoneDigits?: unknown;
  email?: unknown;
  notifyFeatures?: unknown;
  avatarId?: unknown;
}): StoredUserProfile {
  let firstName =
    typeof body.firstName === "string"
      ? body.firstName.trim() || undefined
      : undefined;
  let lastName =
    typeof body.lastName === "string"
      ? body.lastName.trim() || undefined
      : undefined;

  if (!firstName && !lastName && typeof body.displayName === "string") {
    const full = body.displayName.trim();
    if (full) {
      const space = full.indexOf(" ");
      if (space === -1) {
        firstName = full;
      } else {
        firstName = full.slice(0, space).trim() || undefined;
        lastName = full.slice(space + 1).trim() || undefined;
      }
    }
  }

  const emailRaw =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const email =
    emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
      ? emailRaw
      : undefined;

  return {
    firstName,
    lastName,
    birthDate:
      typeof body.birthDate === "string"
        ? body.birthDate.trim() || undefined
        : undefined,
    phoneDigits:
      typeof body.phoneDigits === "string"
        ? body.phoneDigits.replace(/\D/g, "").slice(0, 10) || undefined
        : undefined,
    email,
    notifyFeatures:
      typeof body.notifyFeatures === "boolean"
        ? body.notifyFeatures
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
    const current = await getStoredUserProfile(user.telegramId);
    const next = normalizeProfile(body);
    const profile = await updateStoredUserProfile(user.telegramId, {
      ...current,
      ...next,
      // Preserve notifyFeatures when client omits the field.
      notifyFeatures:
        typeof body.notifyFeatures === "boolean"
          ? body.notifyFeatures
          : current.notifyFeatures,
    });

    return Response.json({ profile });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await deleteUserAccount(user.telegramId);
    return Response.json({ ok: true });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
