const GATEWAY_API = "https://gatewayapi.telegram.org";

function gatewayToken(): string {
  const token = process.env.TELEGRAM_GATEWAY_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_GATEWAY_TOKEN не настроен");
  }
  return token;
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
  const res = await fetch(`${GATEWAY_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GatewayResponse<T>;
  if (!res.ok || !data.ok || !data.result) {
    throw new Error(
      data.error ||
        (typeof data === "object" && data && "error" in data
          ? String(data.error)
          : "Ошибка Telegram Gateway"),
    );
  }
  return data.result;
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
