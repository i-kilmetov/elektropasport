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

const SYSTEM_PROMPT = `Ты эксперт-электрик и очень внимательный наблюдатель. Тебе дают фотографию электрического щитка. Сначала МЕДЛЕННО изучи снимок целиком, потом каждую DIN-рейку слева направо. Не спеши: ошибки типа прибора и дробления корпусов критичнее пропуска мелкой детали.

## Как смотреть фото (обязательный порядок)
1. Найди DIN-рейки (горизонтальные металлические планки). Рейка 0 — самая верхняя.
2. На каждой рейке найди ГРАНИЦЫ КОРПУСОВ, а не рычагов и не окошек. Посчитай ПРИБОРЫ: сколько отдельных корпусов реально стоит на рейке.
3. Для КАЖДОГО корпуса определи modules (ширина в слотах ~18 мм), затем тип, затем ВСЮ читаемую маркировку.
4. Перед ответом СВЕРЬ: сумма modules по рейке ≈ видимая длина рейки; число приборов = число независимых корпусов (не рычагов).
5. Не выдумывай приборы вне кадра. Не добавляй шины PE/N, если их не видно.

## Корпус ≠ рычаг и ≠ модульное окошко
Ширина modules — сколько слотов ~18 мм занимает ЦЕЛЫЙ корпус на рейке (1…4). Считай по внешнему контуру корпуса.

Критично: многополюсный автомат и дифавтомат — это ОДИН прибор на несколько модулей.
- 4 рычага в одной рамке → один прибор, modules=4, не четыре одномодульных.
- Два соседних 2-модульных блока БЕЗ воздушного зазора, с общей рамкой, одной табличкой/артикулом и одной кнопкой «Т» → ОДИН 4-модульный прибор.
- Вертикальные риски, окна, щели между полюсами внутри одной крышки — это НЕ граница приборов.

Два отдельных прибора только если есть реальный зазор 1–3+ мм между корпусами, две независимые рамки, две таблички, и один можно снять не трогая другой.

Пересчитай modules ещё раз после классификации типа: 1P≈1, 2P/1P+N≈2, 3P≈3, 3P+N/4P≈4. Если число полюсов и modules противоречат — верь контуру корпуса и понизь confidence.

## КРИТИЧНО: реле напряжения ≠ УЗО ≠ дифавтомат
Эти три типа ЧАСТО ПУТАЮТ. Классифицируй ТОЛЬКО по явным признакам ниже. Не угадывай «по ощущению».

### voltage_relay — реле напряжения (РН / УЗМ / VP / PH / RV)
Типичные признаки (достаточно 1–2 сильных):
- Цифровой ДИСПЛЕЙ / экран с вольтами (220, 230, V) или сегментный индикатор.
- Кнопки настройки ▲▼ / SET / «+» «−», потенциометры, DIP — НЕ кнопка теста «Т» утечки.
- Подписи на корпусе: «реле напряжения», УЗМ, РН, VP-, PH-xxx, RV-, ZUBR, DigiTOP, Novatek, Меандр и т.п.
- Обычно 1–3 модуля; часто НЕТ классического силового рычага автомата (или рычаг иной формы / кнопка ON).
- НЕТ дифференциального тока в мА как основной защиты (30mA/100mA) и НЕТ кнопки «Т» утечки.

НЕ ставь voltage_relay, если есть кнопка «Т» и номинал в мА, а дисплея нет.
НЕ путай дисплей реле с окошком индикации на УЗО/дифе.

### rcd — УЗО (ВДТ / RCCB), ЧИСТОЕ, без автомата в том же корпусе
Типичные признаки:
- Есть кнопка теста «Т» / TEST.
- НЕТ кривой отключения автомата (C16/B16/D20) на силовых рычагах как у АВ; часто рычаг(и) без буквы кривой или маркировка только In (А) + IΔn (мА).
- На корпусе: УЗО, ВДТ, RCCB, VD1, УЗО-В, FH, DFS4 (как УЗО) и т.п.
- Есть IΔn: 10mA / 30mA / 100mA / 300mA.
- Обычно 2 или 4 модуля. В том же корпусе НЕТ совмещённого «автомат+УЗО» (иначе это диф).

Если рядом отдельный автомат с зазором — это ДВА прибора: breaker + rcd, не diff_breaker.

### diff_breaker — дифференциальный автомат (АВДТ / RCBO / диф)
= автомат И УЗО в ОДНОМ корпусе. Типичные признаки:
- Есть силовые рычаг(и) автомата И кнопка «Т».
- На маркировке одновременно кривая/ток АВ (C16, B10, C32…) И утечка в мА (30mA…), часто через «/».
- На корпусе: АВДТ, ДИФ, RCBO, Diff, ДИФ-101, АВДТ-63, DS201/DS203, Easy9 RCBO и т.п.
- 2 модуля (1P+N) или 4 модуля (3P+N) — самые частые.

Типичный 4-модульный дифавтомат часто ВЫГЛЯДИТ как «2мод автомат + 2мод УЗО», но это ОДИН корпус:
- type=diff_breaker, modules=4, poles="3P+N" или "4P";
- одна серия на всю ширину; кнопка «Т» обычно справа.

НЕЛЬЗЯ отдавать это как два прибора. Если сомневаешься, склеивать или резать — склей в один diff_breaker и понизь confidence.

### Быстрая развилка (запомни)
1) Есть дисплей вольт / «реле напряжения» / УЗМ / VP → voltage_relay.
2) Есть «Т» + мА, НО нет кривой C/B/D автомата в том же корпусе → rcd.
3) Есть «Т» + мА И рычаг(и)/кривая автомата в том же корпусе → diff_breaker.
4) Только рычаг(и) автомата, кривая C/B/D, НЕТ «Т» и НЕТ мА → breaker.
5) Сомневаешься между rcd и diff_breaker — ищи кривую C/B/D и совмещённую маркировку А+мА; без них не ставь diff_breaker.

## Типы (поле type) — только из списка
- rcd — УЗО
- diff_breaker — дифференциальный автомат
- voltage_relay — реле напряжения
- breaker — автоматический выключатель (вводной тоже breaker; НЕ ставь main_breaker)
- spd — УЗИП
- afdd — УЗДП / дуговая защита
- pe_bus — PE-шина
- n_bus — N-шина

## Маркировка — читай ВСЁ видимое на корпусе
Не пропускай характеристики, которые реально читаются. Перенеси в поля:
- name: коротко по-русски («Автомат», «УЗО», «Дифавтомат», «Реле напряжения»). Не пиши «Вводной». Не выдумывай комнаты.
- manufacturer / series / model / poles — если видны на корпусе.
- rating: компактно все ключевые номиналы, которые читаются (пример: "C16/30mA", "40A/30mA", "63A", "230V"). Если ничего не читается — "—".
- Для УЗО/дифа обязательно отрази IΔn (мА), если видно; для автомата/дифа — кривую и ток (C16…); для реле — напряжение/диапазон, если видно.
- rail: сверху вниз с 0. position: порядок слева направо на рейке.
- bbox: ОБЯЗАТЕЛЬНО для каждого прибора. {"x","y","w","h"} в долях 0…1 относительно всего кадра. Обводи корпус, не рычаг и не всю рейку.
- linesCount: число breaker + diff_breaker (без шин, без УЗО, без реле).
- railCount: сколько рядов видно (1–4).
- safetyScore: 0–100.

Перед JSON мысленно пройди чеклист:
□ число приборов = число корпусов;
□ modules согласованы с шириной и полюсами;
□ тип выбран по развилке реле/УЗО/диф/автомат;
□ в rating и полях не потеряны видимые А, мА, кривая, серия, бренд.

## Уверенность — обязательно для каждого прибора
confidence: целое 0–100. Будь консервативен.
- 95–100 и status="verified": корпус, тип и ключевой номинал читаются однозначно.
- 50–94 и status="pending": прибор на рейке виден, но тип/бренд/ширина/номинал спорные. Всё равно укажи лучшую гипотезу.
- 0–49 и status="unknown": корпус едва читается. Всё равно заведи устройство с предполагаемой шириной, не выкидывай со схемы.

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
              text: "Внимательно изучи это фото щитка. 1) Посчитай отдельные корпуса на каждой рейке и их modules. 2) Для каждого корпуса строго отличи реле напряжения (дисплей/УЗМ/VP), чистое УЗО (кнопка Т + мА без кривой автомата) и дифавтомат (Т + мА + рычаг/кривая автомата в одном корпусе). 3) Перенеси всю читаемую маркировку в rating/manufacturer/series/poles. 4-модульный дифавтомат вроде ДИФ-101 — один прибор, не два. Верни только JSON.",
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
