import type { ApplianceManual } from "@/types";

const MANUAL_TITLE_RU: Record<string, string> = {
  brochure: "Брошюра",
  "product brochure": "Брошюра производителя",
  manual: "Руководство",
  "user manual": "Руководство пользователя",
  "instruction manual": "Инструкция",
  "installation manual": "Инструкция по установке",
  "quick start guide": "Краткое руководство",
  "quick start": "Краткое руководство",
  datasheet: "Техническая спецификация",
  "data sheet": "Техническая спецификация",
  leaflet: "Листовка",
  "product fiche": "Лист характеристик (ЕС)",
  "energy label": "Энергоэтикетка",
  "eu product fiche": "Лист характеристик (ЕС)",
  "safety sheet": "Лист безопасности",
  "warranty card": "Гарантийный талон",
};

/** Skip search-page placeholders and manufacturer site search links. */
export function isRealApplianceDocument(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const href = parsed.href.toLowerCase();

    if (host.includes("manualslib.com") && path.includes("/search")) {
      return false;
    }
    if (host.includes("icecat.biz") && path.includes("/search")) {
      return false;
    }

    if (href.includes(".pdf")) return true;
    if (href.includes("product-pdf")) return true;
    if (host.includes("objects.icecat.biz")) return true;
    if (host.includes("eprel.ec.europa.eu")) return true;
    if (host.includes("icecat.biz") && path.includes("/rest/")) return true;

    return false;
  } catch {
    return false;
  }
}

export function localizeApplianceManualTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Документ";
  if (/[а-яё]/i.test(trimmed)) return trimmed;

  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  const exact = MANUAL_TITLE_RU[key];
  if (exact) return exact;

  if (/^brochure\b/i.test(trimmed)) return "Брошюра";
  if (/^user manual/i.test(trimmed)) return "Руководство пользователя";
  if (/^manual\b/i.test(trimmed)) return "Руководство";
  if (/^quick start/i.test(trimmed)) return "Краткое руководство";
  if (/^datasheet/i.test(trimmed)) return "Техническая спецификация";
  if (/^leaflet/i.test(trimmed)) return "Листовка";
  if (/^product fiche/i.test(trimmed)) return "Лист характеристик (ЕС)";
  if (/^installation/i.test(trimmed)) return "Инструкция по установке";

  return trimmed;
}

export function displayApplianceManuals(
  manuals: ApplianceManual[] | undefined,
): ApplianceManual[] {
  const seen = new Set<string>();
  const result: ApplianceManual[] = [];
  for (const item of manuals ?? []) {
    const url = item.url?.trim();
    if (!url || !isRealApplianceDocument(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({
      title: localizeApplianceManualTitle(item.title),
      url,
    });
  }
  return result;
}
