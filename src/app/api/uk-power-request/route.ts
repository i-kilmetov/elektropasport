import { operatorEmail } from "@/lib/legal-operator";
import { isValidEmail } from "@/lib/uk-power-request";

export const runtime = "nodejs";

type Body = {
  to?: unknown;
  replyTo?: unknown;
  subject?: unknown;
  body?: unknown;
  fullName?: unknown;
  address?: unknown;
  phone?: unknown;
  panelId?: unknown;
};

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 8;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function takeRateSlot(key: string): boolean {
  const now = Date.now();
  const cur = rateBuckets.get(key);
  if (!cur || now >= cur.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (cur.count >= RATE_MAX) return false;
  cur.count += 1;
  return true;
}

function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

async function sendViaResend(input: {
  apiKey: string;
  from: string;
  to: string;
  replyTo: string;
  bcc: string;
  subject: string;
  text: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      reply_to: input.replyTo,
      bcc: [input.bcc],
      subject: input.subject,
      text: input.text,
    }),
  });
  const payload = (await res.json().catch(() => null)) as {
    id?: string;
    message?: string;
    name?: string;
  } | null;
  if (!res.ok) {
    return {
      ok: false,
      error:
        payload?.message ||
        payload?.name ||
        `Resend HTTP ${res.status}`,
    };
  }
  return { ok: true, id: typeof payload?.id === "string" ? payload.id : null };
}

export async function POST(request: Request) {
  try {
    if (!takeRateSlot(clientKey(request))) {
      return Response.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      );
    }

    const json = (await request.json()) as Body;
    const to = asTrimmedString(json.to, 200);
    const replyTo = asTrimmedString(json.replyTo, 200);
    const subject = asTrimmedString(json.subject, 300);
    const body = asTrimmedString(json.body, 12_000);
    const fullName = asTrimmedString(json.fullName, 200);
    const address = asTrimmedString(json.address, 400);
    const phone = asTrimmedString(json.phone, 40);

    if (!to || !isValidEmail(to)) {
      return Response.json(
        { error: "Укажите корректный email управляющей компании" },
        { status: 400 },
      );
    }
    if (!replyTo || !isValidEmail(replyTo)) {
      return Response.json(
        { error: "Укажите корректный email для ответа" },
        { status: 400 },
      );
    }
    if (!subject || !body) {
      return Response.json(
        { error: "Тема и текст письма обязательны" },
        { status: 400 },
      );
    }
    if (!fullName || !address || !phone) {
      return Response.json(
        { error: "Заполните ФИО, адрес и телефон" },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        {
          error: "Отправка из Током пока не настроена",
          code: "email_not_configured",
        },
        { status: 503 },
      );
    }

    const support = operatorEmail();
    const fromName = "Током";
    const from = `${fromName} <${support}>`;

    const result = await sendViaResend({
      apiKey,
      from,
      to,
      replyTo,
      bcc: support,
      subject,
      text: body,
    });

    if (!result.ok) {
      console.error("[uk-power-request] resend failed", result.error);
      return Response.json(
        { error: "Не удалось отправить письмо. Попробуйте позже." },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      id: result.id,
      meta: {
        address,
        panelId:
          typeof json.panelId === "string" ? json.panelId.trim() || null : null,
      },
    });
  } catch (error) {
    console.error("[uk-power-request]", error);
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
