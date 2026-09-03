import { NextResponse } from "next/server";
import { enrichDevicesFromPanelCatalog } from "@/lib/panel-catalog";
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

const SYSTEM_PROMPT = `Ты эксперт-электрик и очень внимательный наблюдатель. Тебе дают фотографию электрического щитка. Сначала МЕДЛЕННО изучи снимок целиком, потом каждую DIN-рейку слева направо. Не спеши: ошибки дробления корпусов хуже, чем пропуск мелкой маркировки.

## Как смотреть фото
1. Найди DIN-рейки (горизонтальные металлические планки). Рейка 0 — самая верхняя.
2. На каждой рейке найди ГРАНИЦЫ КОРПУСОВ, а не рычагов и не окошек.
3. Один прибор = один физический корпус / одна общая лицевая рамка. Только потом читай тип, бренд, номинал.
4. Не выдумывай приборы вне кадра. Не добавляй шины PE/N, если их не видно.

## Корпус ≠ рычаг и ≠ модульное окошко
Ширина modules — это сколько слотов ~18 мм занимает ЦЕЛЫЙ корпус на рейке (1…4). Считай по внешнему контуру корпуса.

Критично: многополюсный автомат и дифавтомат — это ОДИН прибор на несколько модулей.
- 4 рычага в одной рамке → один прибор, modules=4, не четыре одномодульных.
- Два соседних 2-модульных блока БЕЗ воздушного зазора, с общей рамкой, одной табличкой/артикулом и одной кнопкой «Т» → ОДИН 4-модульный прибор.
- Вертикальные риски, окна, щели между полюсами внутри одной крышки — это НЕ граница приборов.

Два отдельных прибора только если есть реальный зазор 1–3+ мм между корпусами, две независимые рамки, две таблички, и один можно снять не трогая другой.

## Дифавтоматы 2 и 4 модуля — частая ошибка
Дифавтомат (type=diff_breaker) = автомат + УЗО в одном корпусе: есть рычаг(и) И кнопка «Т».

Типичный 4-модульный дифавтомат (DEKraft/Dekraft ДИФ-101 3P+N, IEK АВДТ, EKF АВДТ-63, Schneider Easy9 RCBO 3P+N, ABB DS203 и аналоги) часто ВЫГЛЯДИТ как «двухмодульный автомат + двухмодульное УЗО». Это один корпус:
- type=diff_breaker, modules=4, poles="3P+N" или "4P";
- одна серия на всю ширину (например ДИФ-101);
- кнопка «Т» обычно справа, рычаги слева/по всей ширине, часто связаны гребенкой.

НЕЛЬЗЯ отдавать это как два прибора modules=2. Если сомневаешься, склеивать или резать — склей в один корпус и понизь confidence.

Чистое УЗО (type=rcd): кнопка «Т», нет силового рычага автомата в том же корпусе (или только нейтральный/неавтоматный выключатель). Отдельный автомат рядом с отдельным УЗО — два прибора, между ними виден зазор.

## Типы (поле type) — только из списка
- rcd — УЗО
- diff_breaker — дифференциальный автомат
- voltage_relay — реле напряжения (часто дисплей)
- breaker — автоматический выключатель (вводной тоже breaker; НЕ ставь main_breaker)
- spd — УЗИП
- afdd — УЗДП / дуговая защита
- pe_bus — PE-шина
- n_bus — N-шина

## Маркировка
Читай только то, что реально видно: C16, 63A, 30mA, ДИФ-101, ВА47-29 и т.п.
- name: коротко по-русски («Автомат», «УЗО», «Дифавтомат»). Не пиши «Вводной». Не выдумывай комнаты.
- manufacturer / series / model / poles — только если читаются на корпусе. Иначе опусти поле.
- rating: если номинал не читается — "—".
- rail: сверху вниз с 0. position: порядок обхода слева направо, с 0 на каждой рейке или сквозной — главное, не перепутай порядок.
- bbox: ОБЯЗАТЕЛЬНО для каждого прибора. Нормализованный прямоугольник корпуса на фото: {"x":0.12,"y":0.2,"w":0.08,"h":0.15}, где x/y — левый верхний угол, w/h — ширина/высота, все значения от 0 до 1 относительно ширины и высоты всего кадра. Обводи именно корпус прибора, не рычаг и не всю рейку.
- linesCount: число breaker + diff_breaker (без шин).
- railCount: сколько рядов видно (1–4).
- safetyScore: 0–100.

## Уверенность — обязательно для каждого прибора
confidence: целое 0–100. Будь консервативен.
- 95–100 и status="verified": корпус, тип и ключевой номинал читаются однозначно.
- 50–94 и status="pending": прибор на рейке виден, но тип/бренд/ширина/номинал спорные. Всё равно укажи лучшую гипотезу.
- 0–49 и status="unknown": корпус едва читается, блик, сильный ракурс, неясно даже УЗО это или автомат. Всё равно заведи устройство с предполагаемой шириной корпуса, не выкидывай его со схемы.

Если не уверен в границах — один широкий pending/unknown лучше, чем два вымышленных узких.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "devices": [
    {
      "id": 1,
      "type": "diff_breaker",
      "name": "Дифавтомат",
      "rating": "C32/30mA",
      "status": "verified",
      "manufacturer": "DEKraft",
      "series": "ДИФ-101",
      "confidence": 96,
      "position": 0,
      "rail": 0,
      "modules": 4,
      "poles": "3P+N",
      "bbox": { "x": 0.1, "y": 0.18, "w": 0.28, "h": 0.22 }
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
      temperature: 0.05,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: params.imageDataUrl, detail: "high" },
            },
            {
              type: "text",
              text: "Внимательно изучи это фото щитка. Сначала найди границы корпусов на каждой рейке (не путай корпус с рычагами и окошками) и укажи bbox 0–1 для каждого. 4-модульный дифавтомат вроде DEKraft ДИФ-101 — это один прибор, а не два двухмодульных. Если прибор плохо читается, всё равно включи его в JSON с низким confidence и status pending или unknown. Верни только JSON.",
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
      const devices = await enrichDevicesFromPanelCatalog(normalized.devices);

      if (devices.length === 0) {
        return NextResponse.json(
          {
            error:
              "Не удалось распознать устройства. Сфотографируйте щиток ближе и при хорошем свете.",
          },
          { status: 422 },
        );
      }

      return NextResponse.json({
        ...normalized,
        devices,
        model,
        provider: "qwen",
      });
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
