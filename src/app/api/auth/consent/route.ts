import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import {
  dbErrorResponse,
  ensureSchema,
  recordUserPdConsent,
  upsertUser,
  userHasPdConsent,
} from "@/lib/db";
import {
  PD_CONSENT_VERSION,
  isPdConsentCookieValid,
  pdConsentCookieClearHeader,
  pdConsentCookieHeader,
  readPdConsentCookie,
} from "@/lib/pd-consent";

export async function GET(request: Request) {
  try {
    let accepted = isPdConsentCookieValid(readPdConsentCookie(request));

    try {
      const user = requireTelegramUser(request);
      await ensureSchema();
      await upsertUser(user);
      accepted = (await userHasPdConsent(user.telegramId)) || accepted;
    } catch (error) {
      if (error instanceof Error && error.name === "AuthError") {
        // Pre-login check — cookie only.
      } else {
        throw error;
      }
    }

    const response = Response.json({
      accepted,
      version: accepted ? PD_CONSENT_VERSION : null,
    });
    if (accepted) {
      response.headers.set("Set-Cookie", pdConsentCookieHeader());
    }
    return response;
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const response = Response.json({ ok: true, version: PD_CONSENT_VERSION });
    response.headers.set("Set-Cookie", pdConsentCookieHeader());

    try {
      const user = requireTelegramUser(request);
      await ensureSchema();
      await upsertUser(user);
      await recordUserPdConsent(user.telegramId, PD_CONSENT_VERSION);
    } catch (error) {
      if (error instanceof Error && error.name === "AuthError") {
        // Cookie is enough before OAuth redirect.
      } else {
        throw error;
      }
    }

    return response;
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", pdConsentCookieClearHeader());
  return response;
}
