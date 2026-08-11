import { NextResponse } from "next/server";
import {
  extractJsonObject,
  normalizeAnalyzeResult,
} from "@/lib/normalize-devices";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Prefer stable free-tier vision models; override with GEMINI_MODEL. */
const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
];

function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function mimeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);/i.exec(dataUrl);
  return match?.[1] || "image/jpeg";
}

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const list = preferred
    ? [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)]
    : DEFAULT_MODELS;
  return list;
}

const SYSTEM_PROMPT = `Ты эксперт по электрическим щиткам (квартиры, дома, гаражи, дачи).
По фотографии щитка распознай все видимые устройства слева направо / сверху вниз.

Типы устройств (поле type):
- main_breaker — вводной автомат
- rcd — УЗО
- diff_breaker — дифференциальный автомат
- voltage_relay — реле напряжения
- breaker — автоматический выключатель линии
- pe_bus — PE-шина (заземление)
- n_bus — N-шина (нейтраль)

Правила:
- Читай маркировку номиналов (C16, 63A, 30mA и т.п.), если видно.
- name: краткое русское имя (например «Вводной автомат», «Кухня», «УЗО»). Если назначение линии неизвестно — «Автомат QF3» и т.п.
- status: "verified" если уверенность ≥ 80, иначе "pending", если почти не видно — "unknown".
- confidence: 0–100.
- position: порядок слева направо, начиная с 0.
- manufacturer: бренд если читается, иначе опусти поле.
- linesCount: число линий/автоматов нагрузки (без шин).
- safetyScore: 0–100, оценка безопасности щитка (наличие УЗО/дифов, реле, общее состояние). Если УЗО нет — снижай оценку.

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
      "position": 0
    }
  ],
  "safetyScore": 78,
  "linesCount": 8
}`;

function geminiErrorMessage(status: number, body: string): string {
  if (status === 400 && /API key/i.test(body)) {
    return "Неверный GEMINI_API_KEY";
  }
  if (status === 403) {
    return "Gemini отклонил запрос (регион/доступ). Ключ мог быть создан в недоступном регионе, либо сервис временно ограничен.";
  }
  if (status === 429) {
    return "Лимит Gemini исчерпан. Подождите минуту и попробуйте снова.";
  }
  if (status === 404) {
    return "Модель Gemini не найдена";
  }
  return "Ошибка Gemini при анализе фото";
}

async function callGemini(params: {
  apiKey: string;
  model: string;
  base64: string;
  mimeType: string;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Проанализируй этот электрический щиток и верни JSON со списком устройств.",
            },
            {
              inline_data: {
                mime_type: params.mimeType,
                data: params.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }

  let parsed: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, status: 502, body: "Invalid JSON from Gemini" };
  }

  const text = parsed.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return { ok: false, status: 502, body: "Empty Gemini response" };
  }

  return { ok: true, text };
}

/** Health check: key present + models list reachable from this server. */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      provider: "gemini",
      error: "GEMINI_API_KEY не задан",
    });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          provider: "gemini",
          status: res.status,
          error: geminiErrorMessage(res.status, text),
          hint:
            res.status === 403
              ? "С Vercel обычно работает. Если 403 — ключ/аккаунт ограничен по региону."
              : undefined,
        },
        { status: 200 },
      );
    }

    const data = JSON.parse(text) as {
      models?: Array<{ name?: string }>;
    };
    const names = (data.models ?? [])
      .map((m) => m.name?.replace(/^models\//, ""))
      .filter(Boolean);

    const candidates = modelCandidates();
    const available = candidates.filter((m) => names.includes(m));

    return NextResponse.json({
      ok: true,
      provider: "gemini",
      modelsPreferred: candidates,
      modelsAvailable: available.length > 0 ? available : candidates.slice(0, 1),
      totalModelsVisible: names.length,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      provider: "gemini",
      error: err instanceof Error ? err.message : "Network error",
    });
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY не настроен. Добавьте ключ в Environment Variables на Vercel.",
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

  const base64 = stripDataUrlPrefix(raw);
  if (base64.length < 100) {
    return NextResponse.json(
      { error: "Изображение слишком маленькое или повреждено" },
      { status: 400 },
    );
  }

  const mimeType = raw.startsWith("data:")
    ? mimeFromDataUrl(raw)
    : "image/jpeg";

  const models = modelCandidates();
  let lastError = "Ошибка Gemini при анализе фото";

  try {
    for (const model of models) {
      const result = await callGemini({ apiKey, model, base64, mimeType });
      if (!result.ok) {
        console.error(`Gemini ${model} error:`, result.status, result.body.slice(0, 500));
        lastError = geminiErrorMessage(result.status, result.body);
        // Try next model on 404 (model missing/deprecated)
        if (result.status === 404) continue;
        // Fatal auth/region/quota — stop
        if (result.status === 401 || result.status === 403 || result.status === 429) {
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

      return NextResponse.json({ ...normalized, model });
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
