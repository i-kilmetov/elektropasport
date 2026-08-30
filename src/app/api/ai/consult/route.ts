import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { parseLeadReady } from "@/lib/ai-lead-ready";
import {
  callYandexAiAgent,
  isYandexAiConfigured,
  type AiChatMessage,
} from "@/lib/yandex-ai-studio";

export const runtime = "nodejs";
export const maxDuration = 60;

function normalizeHistory(raw: unknown): AiChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AiChatMessage[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      continue;
    }
    out.push({ role, content: content.trim() });
  }
  return out.slice(-20);
}

export async function POST(request: Request) {
  try {
    requireTelegramUser(request);

    if (!isYandexAiConfigured()) {
      return Response.json(
        { error: "ИИ-консультант ещё не настроен на сервере" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      message?: string;
      history?: unknown;
      city?: string;
    };

    const message = body.message?.trim();
    if (!message) {
      return Response.json({ error: "Пустое сообщение" }, { status: 400 });
    }

    const result = await callYandexAiAgent({
      message,
      history: normalizeHistory(body.history),
      city: body.city?.trim(),
    });

    const parsed = parseLeadReady(result.text);

    return Response.json({
      reply: parsed.visibleText,
      leadReady: parsed.lead,
      responseId: result.responseId,
    });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Не удалось получить ответ консультанта",
        },
        { status: 502 },
      )
    );
  }
}
