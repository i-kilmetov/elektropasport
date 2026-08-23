import {
  AuthError,
  authErrorResponse,
  requireTelegramUser,
  type ValidatedTelegramUser,
} from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import {
  appendGoogleSheetRow,
  isGoogleSheetsConfigured,
} from "@/lib/google-sheets";
import {
  buildSurveySheetRow,
  formatAnswerLabel,
  validateSurveyAnswers,
  type SurveyAnswers,
} from "@/lib/research-survey";
import { notifyAdminResearchSurvey } from "@/lib/telegram-notify";

function optionalTelegramUser(request: Request): ValidatedTelegramUser | null {
  try {
    return requireTelegramUser(request);
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}

function displayName(user: ValidatedTelegramUser | null): string {
  if (!user) return "Аноним";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username) return `@${user.username}`;
  return `id ${user.telegramId}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { answers?: unknown };
    const validated = validateSurveyAnswers(body.answers);
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    const answers = body.answers as SurveyAnswers;
    const user = optionalTelegramUser(request);
    if (user) {
      await ensureSchema();
      await upsertUser(user);
    }

    const row = buildSurveySheetRow({
      answers,
      branch: validated.branch,
      telegramId: user?.telegramId,
      username: user?.username,
      firstName: displayName(user),
    });

    const stored: string[] = [];
    if (isGoogleSheetsConfigured()) {
      await appendGoogleSheetRow(row);
      stored.push("sheets");
    }

    try {
      await notifyAdminResearchSurvey({
        name: displayName(user),
        username: user?.username,
        customerTelegramId: user?.telegramId,
        branch: validated.branch,
        dwelling: formatAnswerLabel("q2", answers),
        typology: formatAnswerLabel("q12", answers),
        need: formatAnswerLabel("q13", answers),
      });
      stored.push("telegram");
    } catch (error) {
      console.error("Research survey telegram notify failed", error);
    }

    if (stored.length === 0) {
      return Response.json(
        {
          error:
            "Приём анкет ещё не настроен: добавьте GOOGLE_SHEETS_WEBHOOK_URL или сервисный аккаунт Google Sheets",
        },
        { status: 503 },
      );
    }

    return Response.json({ ok: true, stored }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
