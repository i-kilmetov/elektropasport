import { createHmac, timingSafeEqual } from "crypto";

/**
 * Telegram endpoints are unreachable from some hosting regions (Amvera Moscow
 * times out on oauth/gatewayapi). Requests fall back to an egress proxy that
 * runs the same code on a region with Telegram access.
 */
export const TELEGRAM_API_HOSTS = [
  "api.telegram.org",
  "oauth.telegram.org",
  "gatewayapi.telegram.org",
] as const;

const DIRECT_TIMEOUT_MS = 8000;
const PROXY_TIMEOUT_MS = 25000;
/** Skip the direct attempt for a while once it is proven to time out. */
const DIRECT_RETRY_AFTER_MS = 10 * 60 * 1000;
const SIGNATURE_HEADER = "x-egress-signature";
const EGRESS_OK_HEADER = "x-egress-ok";
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

let directBlockedUntil = 0;

export function isTelegramApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (TELEGRAM_API_HOSTS as readonly string[]).includes(
      parsed.hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}

/** Shared between both deployments — the bot token is identical everywhere. */
function egressSecret(): string {
  return (
    process.env.TELEGRAM_EGRESS_SECRET?.trim() ||
    process.env.BOT_TOKEN?.trim() ||
    ""
  );
}

export function egressSecretConfigured(): boolean {
  return Boolean(egressSecret());
}

export function signEgressPayload(payload: string): string {
  return createHmac("sha256", egressSecret()).update(payload).digest("hex");
}

export function verifyEgressSignature(
  payload: string,
  signature: string,
): boolean {
  if (!egressSecret() || !signature) return false;
  const expected = Buffer.from(signEgressPayload(payload), "utf8");
  const actual = Buffer.from(signature, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function egressProxyUrl(): string | null {
  const raw = process.env.TELEGRAM_EGRESS_PROXY_URL?.trim();
  if (!raw || raw === "off" || raw === "0" || raw === "false") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

type EgressRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  ts: number;
};

function headerEntries(headers: HeadersInit | undefined): [string, string][] {
  if (!headers) return [];
  if (headers instanceof Headers) return [...headers.entries()];
  if (Array.isArray(headers)) return headers.map(([k, v]) => [k, String(v)]);
  return Object.entries(headers).map(([k, v]) => [k, String(v)]);
}

function normalizeBody(body: BodyInit | null | undefined): {
  text?: string;
  contentType?: string;
} {
  if (body == null) return {};
  if (typeof body === "string") return { text: body };
  if (body instanceof URLSearchParams) {
    return {
      text: body.toString(),
      contentType: "application/x-www-form-urlencoded;charset=UTF-8",
    };
  }
  throw new Error("Тело запроса не поддерживается Telegram egress прокси");
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  const cause = (error as { cause?: unknown }).cause;
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code?: unknown }).code)
      : "";
  return (
    error.message === "fetch failed" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ECONNRESET" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  );
}

/** Direct call without proxy fallback — used by the proxy route itself. */
export async function directTelegramFetch(
  url: string,
  init: RequestInit,
  options?: { timeoutMs?: number },
): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(options?.timeoutMs ?? DIRECT_TIMEOUT_MS),
  });
}

async function proxyTelegramFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const proxy = egressProxyUrl();
  if (!proxy) {
    throw new Error(
      "Telegram недоступен с этого сервера, а TELEGRAM_EGRESS_PROXY_URL не настроен",
    );
  }
  if (!egressSecret()) {
    throw new Error("BOT_TOKEN не настроен — нельзя подписать egress-запрос");
  }

  const { text, contentType } = normalizeBody(init.body);
  const headers: Record<string, string> = {};
  for (const [key, value] of headerEntries(init.headers)) {
    headers[key.toLowerCase()] = value;
  }
  if (contentType && !headers["content-type"]) {
    headers["content-type"] = contentType;
  }

  const payload: EgressRequest = {
    url,
    method: (init.method ?? "GET").toUpperCase(),
    headers,
    body: text,
    ts: Date.now(),
  };
  const raw = JSON.stringify(payload);

  const res = await fetch(proxy, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SIGNATURE_HEADER]: signEgressPayload(raw),
    },
    body: raw,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  });

  if (!res.headers.get(EGRESS_OK_HEADER)) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Telegram egress прокси ответил ${res.status}: ${detail}`);
  }
  return res;
}

/**
 * Telegram request with automatic egress fallback.
 * Non-Telegram URLs are passed through untouched.
 */
export async function telegramFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  if (!isTelegramApiUrl(url)) {
    return fetch(url, init);
  }

  if (Date.now() >= directBlockedUntil) {
    try {
      return await directTelegramFetch(url, init);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      directBlockedUntil = Date.now() + DIRECT_RETRY_AFTER_MS;
      console.error(
        `telegram direct egress blocked (${new URL(url).host}) — using proxy`,
        error,
      );
    }
  }

  return proxyTelegramFetch(url, init);
}

export function parseEgressRequest(raw: string): EgressRequest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const value = parsed as Partial<EgressRequest>;
  if (typeof value.url !== "string" || !isTelegramApiUrl(value.url)) return null;
  const method = String(value.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") return null;
  if (typeof value.ts !== "number") return null;
  if (Math.abs(Date.now() - value.ts) > MAX_SIGNATURE_AGE_MS) return null;
  const headers: Record<string, string> = {};
  if (value.headers && typeof value.headers === "object") {
    for (const [key, headerValue] of Object.entries(value.headers)) {
      if (typeof headerValue === "string") headers[key] = headerValue;
    }
  }
  return {
    url: value.url,
    method,
    headers,
    body: typeof value.body === "string" ? value.body : undefined,
    ts: value.ts,
  };
}

export const EGRESS_SIGNATURE_HEADER = SIGNATURE_HEADER;
export const EGRESS_RESULT_HEADER = EGRESS_OK_HEADER;
