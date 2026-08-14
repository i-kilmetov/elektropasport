import { NextResponse } from "next/server";
import {
  extractJsonObject,
  normalizeAnalyzeResult,
} from "@/lib/normalize-devices";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/** Prefer Qwen VL; override with QWEN_VL_MODEL. */
const DEFAULT_MODELS = [
  "qwen3-vl-plus",
  "qwen3-vl-flash",
  "qwen-vl-max",
];

function dashscopeBaseUrl(): string {
  const raw =
    process.env.DASHSCOPE_BASE_URL?.trim() ||
    process.env.QWEN_BASE_URL?.trim() ||
    DEFAULT_BASE_URL;
  return raw.replace(/\/$/, "");
}

function modelCandidates(): string[] {
  const preferred =
    process.env.QWEN_VL_MODEL?.trim() ||
    process.env.DASHSCOPE_MODEL?.trim();
  const list = preferred
    ? [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)]
    : DEFAULT_MODELS;
  return list;
}

function toDataUrl(raw: string, mimeType: string): string {
  if (raw.startsWith("data:")) return raw;
  return `data:${mimeType};base64,${raw}`;
}

function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);/i.exec(dataUrl);
  return match?.[1] || "image/jpeg";
}

const SYSTEM_PROMPT = `Ты эксперт по электрическим щиткам (квартиры, дома, гаражи, дачи).
По фотографии щитка распознай все видимые устройства.

Порядок обхода: сверху вниз по DIN-рейкам, на каждой рейке слева направо.

Типы устройств (поле type) — только из этого списка:
- main_breaker — вводной автомат
- rcd — УЗО (отдельный блок с кнопкой «Т», без рычага автомата в том же корпусе)
- diff_breaker — дифференциальный автомат (автомат и УЗО в одном корпусе, есть рычаг)
- voltage_relay — реле напряжения
- breaker — автоматический выключатель линии
- spd — УЗИП / ограничитель перенапряжений
- afdd — УЗДП / защита от дуги
- pe_bus — PE-шина (заземление)
- n_bus — N-шина (нейтраль)

Правила:
- rail: номер рейки сверху вниз, начиная с 0.
- modules: ширина в модулях DIN (1P≈1, 2P/типичное УЗО≈2, 3P≈3, 4P≈4). Не ставь больше 4.
- Читай маркировку номиналов (C16, 63A, 30mA и т.п.), если видно.
- name: краткое русское имя («Вводной автомат», «УЗО», «Автомат QF3»). Не выдумывай комнаты, если на щитке нет подписей.
- status: "verified" если уверенность ≥ 80, иначе "pending", если почти не видно — "unknown".
- confidence: 0–100.
- position: сквозной порядок обхода, начиная с 0.
- manufacturer: бренд если читается, иначе опусти поле.
- poles: например "1P", "2P", "3P", "4P", если видно.
- linesCount: число линий нагрузки (breaker + diff_breaker), без шин и без вводного, если он отдельный.
- railCount: сколько рядов (реек) видно на фото (1–4).
- safetyScore: 0–100 (наличие УЗО/дифов, реле; если защиты нет — снижай).
- Не добавляй приборы, которых нет в кадре.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "devices": [
    {
      "id": 1,
      "type": "main_breaker",
      "name": "Вводной автомат",
      "rating": "63A",
      "status": "verified",
      "manufacturer": "ABB",
      "confidence": 95,
      "position": 0,
      "rail": 0,
      "modules": 2,
      "poles": "2P"
    }
  ],
  "railCount": 1,
  "safetyScore": 78,
  "linesCount": 8
}`;

function qwenErrorMessage(status: number, body: string): string {
  if (status === 401 || /InvalidApiKey|invalid.*api.?key/i.test(body)) {
    return "Неверный DASHSCOPE_API_KEY";
  }
  if (status === 403 || /AccessDenied|Arrearage/i.test(body)) {
    return "DashScope отклонил запрос. Проверьте регион ключа (Singapore), оплату и активацию модели qwen3-vl-plus.";
  }
  if (status === 429 || /Throttling|RateQuota/i.test(body)) {
    return "Лимит Qwen исчерпан. Подождите минуту и попробуйте снова.";
  }
  if (status === 404 || /ModelNotExist|UnknownModel/i.test(body)) {
    return "Модель Qwen не найдена. Проверьте QWEN_VL_MODEL и регион Singapore.";
  }
  if (status === 400) {
    return "DashScope не принял запрос (формат фото или параметры).";
  }
  return "Ошибка Qwen при анализе фото";
}

async function callQwen(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  imageDataUrl: string;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const url = `${params.baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: params.imageDataUrl },
            },
            {
              type: "text",
              text: "Проанализируй этот электрический щиток и верни JSON со списком устройств.",
            },
          ],
        },
      ],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }

  let parsed: {
    choices?: Array<{
      message?: { content?: string | Array<{ text?: string; type?: string }> };
    }>;
  };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, status: 502, body: "Invalid JSON from Qwen" };
  }

  const content = parsed.choices?.[0]?.message?.content;
  let text = "";
  if (typeof content === "string") {
    text = content.trim();
  } else if (Array.isArray(content)) {
    text = content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  if (!text) {
    return { ok: false, status: 502, body: "Empty Qwen response" };
  }

  return { ok: true, text };
}

/** Health check: key present. */
export async function GET() {
  const apiKey =
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.QWEN_API_KEY?.trim();
  const baseUrl = dashscopeBaseUrl();
  const models = modelCandidates();

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      provider: "qwen",
      error: "DASHSCOPE_API_KEY не задан",
      hint: "Добавьте ключ Singapore из Model Studio в Environment Variables (Vercel) или .env.local",
    });
  }

  return NextResponse.json({
    ok: true,
    provider: "qwen",
    baseUrl,
    modelsPreferred: models,
    model: models[0],
  });
}

export async function POST(request: Request) {
  const apiKey =
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.QWEN_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "DASHSCOPE_API_KEY не настроен. Добавьте ключ в Environment Variables на Vercel (регион Singapore).",
      },
      { status: 500 },
    );
  }

  let body: { imageBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const raw = body.imageBase64?.trim();
  if (!raw) {
    return NextResponse.json(
      { error: "Нет изображения для анализа" },
      { status: 400 },
    );
  }

  const mimeType = raw.startsWith("data:")
    ? mimeFromDataUrl(raw)
    : "image/jpeg";
  const imageDataUrl = toDataUrl(raw, mimeType);

  // Rough size guard (~3.5MB payload) before hitting provider / Vercel limits.
  if (imageDataUrl.length > 3_500_000) {
    return NextResponse.json(
      { error: "Фото слишком большое. Сделайте снимок заново." },
      { status: 400 },
    );
  }

  const baseUrl = dashscopeBaseUrl();
  const models = modelCandidates();
  let lastError = "Ошибка Qwen при анализе фото";

  try {
    for (const model of models) {
      const result = await callQwen({
        apiKey,
        baseUrl,
        model,
        imageDataUrl,
      });
      if (!result.ok) {
        console.error(
          `Qwen ${model} error:`,
          result.status,
          result.body.slice(0, 500),
        );
        lastError = qwenErrorMessage(result.status, result.body);
        if (result.status === 404) continue;
        if (
          result.status === 401 ||
          result.status === 403 ||
          result.status === 429
        ) {
          return NextResponse.json({ error: lastError }, { status: 502 });
        }
        continue;
      }

      const parsed = extractJsonObject(result.text);
      const normalized = normalizeAnalyzeResult(parsed);

      if (normalized.devices.length === 0) {
        return NextResponse.json(
          {
            error:
              "Не удалось распознать устройства. Сфотографируйте щиток ближе и при хорошем свете.",
          },
          { status: 422 },
        );
      }

      return NextResponse.json({ ...normalized, model, provider: "qwen" });
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err) {
    console.error("analyze-panel failed:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка анализа" },
      { status: 500 },
    );
  }
}
