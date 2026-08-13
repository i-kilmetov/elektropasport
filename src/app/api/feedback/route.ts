import {
  authErrorResponse,
  requireTelegramUser,
} from "@/lib/telegram-auth";
import { dbErrorResponse, ensureSchema, upsertUser } from "@/lib/db";
import { notifyAdminFeedback } from "@/lib/telegram-notify";

const MAX_MESSAGE_LENGTH = 2000;
const TOPICS = ["bugs", "tips", "other"] as const;

type FeedbackTopic = (typeof TOPICS)[number];

function displayName(user: {
  firstName?: string;
  lastName?: string;
  username?: string;
}): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username) return `@${user.username}`;
  return "Пользователь";
}

function isTopic(value: unknown): value is FeedbackTopic {
  return typeof value === "string" && TOPICS.includes(value as FeedbackTopic);
}

export async function POST(request: Request) {
  try {
    const user = requireTelegramUser(request);
    await ensureSchema();
    await upsertUser(user);

    const body = (await request.json()) as {
      message?: string;
      topic?: string;
    };
    const message = body.message?.trim() ?? "";
    const topic = body.topic;

    if (!isTopic(topic)) {
      return Response.json({ error: "Выберите тему" }, { status: 400 });
    }
    if (!message) {
      return Response.json({ error: "Напишите сообщение" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Сообщение длиннее ${MAX_MESSAGE_LENGTH} символов` },
        { status: 400 },
      );
    }

    await notifyAdminFeedback({
      message,
      topic,
      name: displayName(user),
      username: user.username,
      customerTelegramId: user.telegramId,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error) ?? authErrorResponse(error);
  }
}
