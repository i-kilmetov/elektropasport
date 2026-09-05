const GATEWAY_API = "https://gatewayapi.telegram.org";
const FLOOD_WAIT_RE = /^FLOOD_WAIT_(\d+)$/i;

function gatewayToken(): string {
  const token = process.env.TELEGRAM_GATEWAY_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_GATEWAY_TOKEN не настроен");
  }
  return token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function floodWaitMs(error: string | undefined): number | null {
  if (!error) return null;
  const match = FLOOD_WAIT_RE.exec(error.trim());
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  // Cap so a bad API value cannot hang the request forever.
  return Math.min(seconds, 30) * 1000 + 250;
}

type GatewayResponse<T> = {
  ok: boolean;
  result?: T;
  error?: string;
};

async function gatewayPost<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  let lastError = "Ошибка Telegram Gateway";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${GATEWAY_API}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GatewayResponse<T>;
    if (res.ok && data.ok && data.result) {
      return data.result;
    }

    lastError =
      data.error ||
      (typeof data === "object" && data && "error" in data
        ? String(data.error)
        : lastError);

    const waitMs = floodWaitMs(data.error);
    if (waitMs == null || attempt === 3) {
      throw new Error(lastError);
    }
    await sleep(waitMs);
  }
  throw new Error(lastError);
}

export async function gatewayCheckSendAbility(phoneE164: string): Promise<{
  request_id: string;
  phone_number: string;
}> {
  const result = await gatewayPost<{
    request_id: string;
    phone_number: string;
  }>("checkSendAbility", { phone_number: phoneE164 });
  return result;
}

export async function gatewaySendVerificationMessage(
  phoneE164: string,
  options?: { requestId?: string; codeLength?: number },
): Promise<{
  request_id: string;
  phone_number: string;
}> {
  const payload: Record<string, unknown> = {
    phone_number: phoneE164,
    code_length: options?.codeLength ?? 6,
    ttl: 300,
  };
  if (options?.requestId) {
    payload.request_id = options.requestId;
  }
  return gatewayPost("sendVerificationMessage", payload);
}

export async function gatewayCheckVerificationStatus(
  requestId: string,
  code: string,
): Promise<{
  verification_status: {
    status: string;
    updated_at?: number;
  };
  phone_number?: string;
}> {
  return gatewayPost("checkVerificationStatus", {
    request_id: requestId,
    code,
  });
}
