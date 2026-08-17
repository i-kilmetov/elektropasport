import type { Device } from "@/types";
import { deviceModules } from "@/lib/panel-rails";

export const ONLINE_CONSULTATION_PRICE_RUB = 499;
export const MODULE_LABELING_PRICE_RUB = 500;

export type LeadServiceType =
  | "online_consultation"
  | "master_labeling"
  | "other";

export type LeadServiceOption = {
  id: LeadServiceType;
  title: string;
  description: string;
  priceLabel: string;
  /** null = price after consultation */
  priceRub: number | null;
  moscowOnly?: boolean;
  requiresModules?: boolean;
};

export function normalizeCityName(city: string): string {
  return city.trim().replace(/\s+/g, " ");
}

export function isMoscow(city: string): boolean {
  const normalized = normalizeCityName(city).toLowerCase();
  return normalized === "москва" || normalized.startsWith("москва ");
}

export function countPanelModules(devices?: Device[] | null): number {
  if (!devices?.length) return 0;
  return devices
    .filter((d) => d.type !== "pe_bus" && d.type !== "n_bus")
    .reduce((sum, device) => sum + deviceModules(device), 0);
}

export function formatRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function masterLabelingPriceRub(moduleCount: number): number {
  return Math.max(0, moduleCount) * MODULE_LABELING_PRICE_RUB;
}

export function getLeadServiceLabel(type: LeadServiceType): string {
  switch (type) {
    case "online_consultation":
      return "Онлайн-консультация";
    case "master_labeling":
      return "Вызов мастера для прозвонки и маркировки";
    case "other":
      return "Другое";
  }
}

export function buildLeadServiceSetupTitle(input: {
  serviceType: LeadServiceType;
  panelModules?: number;
  estimatedPriceRub?: number | null;
}): string {
  const base = getLeadServiceLabel(input.serviceType);
  if (input.serviceType === "master_labeling" && input.panelModules) {
    const price =
      input.estimatedPriceRub ?? masterLabelingPriceRub(input.panelModules);
    return `${base} (${input.panelModules} мод., ${formatRub(price)})`;
  }
  if (
    input.serviceType === "online_consultation" &&
    input.estimatedPriceRub != null
  ) {
    return `${base} (${formatRub(input.estimatedPriceRub)})`;
  }
  if (input.serviceType === "other") {
    return `${base} (стоимость после уточнения)`;
  }
  return base;
}

export function getLeadServiceOptions(input: {
  city: string;
  panelModules?: number | null;
}): LeadServiceOption[] {
  const moscow = isMoscow(input.city);
  const modules =
    typeof input.panelModules === "number" && input.panelModules > 0
      ? input.panelModules
      : null;

  const online: LeadServiceOption = {
    id: "online_consultation",
    title: "Онлайн-консультация",
    description:
      "Поможем базово разобраться, куда смотреть в щитке, что нажимать, а что лучше не нажимать.",
    priceLabel: formatRub(ONLINE_CONSULTATION_PRICE_RUB),
    priceRub: ONLINE_CONSULTATION_PRICE_RUB,
  };

  const master: LeadServiceOption = {
    id: "master_labeling",
    title: "Вызов мастера для прозвонки и маркировки",
    description:
      "Аудит щитка, затяжка клемм, прозвонка линий и маркировка. Стоимость — 500 ₽ за модуль.",
    priceLabel: modules
      ? formatRub(masterLabelingPriceRub(modules))
      : "500 ₽ / модуль",
    priceRub: modules ? masterLabelingPriceRub(modules) : null,
    moscowOnly: true,
    requiresModules: false,
  };

  const other: LeadServiceOption = {
    id: "other",
    title: "Другое",
    description:
      "Пересобрать щиток, переделать электрику, сделать проект — стоимость определим после разговора по телефону.",
    priceLabel: "После уточнения",
    priceRub: null,
    moscowOnly: !moscow ? false : false,
  };

  if (!moscow) {
    return [online, other];
  }

  return [online, master, other];
}

export function payableAmountRub(input: {
  serviceType?: LeadServiceType | null;
  panelModules?: number | null;
}): number | null {
  if (input.serviceType === "online_consultation") {
    return ONLINE_CONSULTATION_PRICE_RUB;
  }
  if (
    input.serviceType === "master_labeling" &&
    typeof input.panelModules === "number" &&
    input.panelModules > 0
  ) {
    return masterLabelingPriceRub(input.panelModules);
  }
  return null;
}

export function resolveRequestTypeCodeForService(
  serviceType: LeadServiceType,
): "C" | "V" | "O" {
  if (serviceType === "online_consultation") return "C";
  if (serviceType === "master_labeling") return "V";
  return "O";
}
