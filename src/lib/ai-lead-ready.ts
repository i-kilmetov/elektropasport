const LEAD_READY_RE = /\[LEAD_READY\]([\s\S]*?)\[\/LEAD_READY\]/i;

export type ParsedAiLead = {
  name: string;
  phone: string;
  city?: string;
  problem?: string;
  urgency?: string;
};

function readField(fields: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = fields[key.toLowerCase()];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeLeadPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.startsWith("7") && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function parseLeadReady(text: string): {
  visibleText: string;
  lead: ParsedAiLead | null;
} {
  const match = LEAD_READY_RE.exec(text);
  if (!match) {
    return { visibleText: text.trim(), lead: null };
  }

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim().toLowerCase();
    const value = trimmed.slice(colon + 1).trim();
    if (key && value) fields[key] = value;
  }

  const name = readField(fields, "name", "имя");
  const phoneRaw = readField(fields, "phone", "телефон");
  const visibleText = text.replace(LEAD_READY_RE, "").trim();

  if (!name || !phoneRaw) {
    return { visibleText, lead: null };
  }

  const phone = normalizeLeadPhone(phoneRaw);
  if (phone.length < 10) {
    return { visibleText, lead: null };
  }

  return {
    visibleText,
    lead: {
      name,
      phone,
      city: readField(fields, "city", "город"),
      problem: readField(fields, "problem", "проблема", "issue"),
      urgency: readField(fields, "urgency", "срочность"),
    },
  };
}
