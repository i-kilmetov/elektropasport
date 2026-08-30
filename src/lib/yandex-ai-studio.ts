const YANDEX_RESPONSES_URL = "https://ai.api.cloud.yandex.net/v1/responses";

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type YandexAiConsultResult = {
  text: string;
  responseId: string | null;
};

export function isYandexAiConfigured(): boolean {
  return Boolean(
    process.env.YANDEX_AI_API_KEY?.trim() &&
      process.env.YANDEX_AI_FOLDER_ID?.trim() &&
      process.env.YANDEX_AI_AGENT_ID?.trim(),
  );
}

function extractOutputText(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";

  const obj = data as Record<string, unknown>;
  if (typeof obj.output_text === "string" && obj.output_text.trim()) {
    return obj.output_text.trim();
  }

  if (!Array.isArray(obj.output)) return "";

  const parts: string[] = [];
  for (const item of obj.output) {
    if (typeof item !== "object" || item === null) continue;
    const block = item as Record<string, unknown>;
    if (block.type !== "message" || !Array.isArray(block.content)) continue;
    for (const chunk of block.content) {
      if (typeof chunk !== "object" || chunk === null) continue;
      const piece = chunk as Record<string, unknown>;
      if (piece.type === "output_text" && typeof piece.text === "string") {
        parts.push(piece.text);
      }
    }
  }

  return parts.join("").trim();
}

export async function callYandexAiAgent(input: {
  message: string;
  history: AiChatMessage[];
  city?: string;
}): Promise<YandexAiConsultResult> {
  const apiKey = process.env.YANDEX_AI_API_KEY?.trim();
  const folderId = process.env.YANDEX_AI_FOLDER_ID?.trim();
  const agentId = process.env.YANDEX_AI_AGENT_ID?.trim();

  if (!apiKey || !folderId || !agentId) {
    throw new Error("Yandex AI не настроен на сервере");
  }

  const conversation: AiChatMessage[] = [
    ...input.history,
    { role: "user", content: input.message },
  ];

  const variables: Record<string, string> = {};
  const city = input.city?.trim();
  if (city) variables.city = city;

  const res = await fetch(YANDEX_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      "x-folder-id": folderId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: {
        id: agentId,
        variables,
      },
      input: conversation,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Yandex AI: ${res.status}${errText ? ` — ${errText.slice(0, 240)}` : ""}`,
    );
  }

  const data = (await res.json()) as { id?: string };
  const text = extractOutputText(data);
  if (!text) {
    throw new Error("Yandex AI вернул пустой ответ");
  }

  return {
    text,
    responseId: typeof data.id === "string" ? data.id : null,
  };
}
