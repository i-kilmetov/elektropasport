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
    const cookieVersion = readPdConsentCookie(request);
    const cookieOk = isPdConsentCookieValid(cookieVersion);
    let accepted = cookieOk;

    try {
      const user = requireTelegramUser(request);
      await ensureSchema();
      await upsertUser(user);

      const inDb = await userHasPdConsent(user.telegramId);
      if (inDb) {
        accepted = true;
      } else if (cookieOk) {
        // Cookie from an earlier gate — persist to the user row so it survives
        // browser clears and doesn't re-prompt after the short OAuth window.
        await recordUserPdConsent(user.telegramId, PD_CONSENT_VERSION);
        accepted = true;
      }
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
