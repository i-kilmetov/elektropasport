import type { Device } from "@/types";
import { deviceModules } from "@/lib/panel-rails";

export const ONLINE_CONSULTATION_PRICE_RUB = 990;
export const MODULE_LABELING_PRICE_RUB = 500;
export const MASTER_HOME_VISIT_PRICE_RUB = 2990;

export type LeadServiceType =
  | "online_consultation"
  | "master_home_visit"
  | "master_labeling"
  | "other";

export type LeadServiceOption = {
  id: LeadServiceType;
  title: string;
  description: string;
  priceLabel: string;
  /** Shown struck-through next to the free/discounted price. */
  struckPriceLabel?: string;
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
    case "master_home_visit":
      return "Вызов мастера на дом";
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
    (input.serviceType === "online_consultation" ||
      input.serviceType === "master_home_visit") &&
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
  /** First paid order — online consultation is free. */
  isFirstOrder?: boolean;
}): LeadServiceOption[] {
  const modules =
    typeof input.panelModules === "number" && input.panelModules > 0
      ? input.panelModules
      : null;
  const firstOrder = Boolean(input.isFirstOrder);

  const online: LeadServiceOption = {
    id: "online_consultation",
    title: "Онлайн-консультация",
    description: firstOrder
      ? "Разберём щиток по фото и схеме: что можно сделать самим, а где уже нужен мастер. Для первого заказа — бесплатно."
      : `Разберём щиток по фото и схеме: что можно сделать самим, а где уже нужен мастер. Если дальше понадобится пересборка, проект или монтаж — сначала консультация. Эти ${formatRub(ONLINE_CONSULTATION_PRICE_RUB)} вычтем из общей стоимости работ.`,
    priceLabel: firstOrder ? formatRub(0) : formatRub(ONLINE_CONSULTATION_PRICE_RUB),
    struckPriceLabel: firstOrder
      ? formatRub(ONLINE_CONSULTATION_PRICE_RUB)
      : undefined,
    priceRub: firstOrder ? 0 : ONLINE_CONSULTATION_PRICE_RUB,
  };

  const homeVisit: LeadServiceOption = {
    id: "master_home_visit",
    title: "Вызов мастера на дом",
    description:
      "Приезд мастера в течение дня, диагностика и консультация на месте.",
    priceLabel: formatRub(MASTER_HOME_VISIT_PRICE_RUB),
    priceRub: MASTER_HOME_VISIT_PRICE_RUB,
  };

  const options: LeadServiceOption[] = [online, homeVisit];

  if (modules) {
    options.push({
      id: "master_labeling",
      title: "Вызов мастера для прозвонки и маркировки",
      description:
        "Мастер приедет, прозвонит линии и подпишет каждый автомат — в щитке сразу станет понятно, что за что отвечает.",
      priceLabel: formatRub(masterLabelingPriceRub(modules)),
      priceRub: masterLabelingPriceRub(modules),
      requiresModules: true,
    });
  }

  return options;
}

export function payableAmountRub(input: {
  serviceType?: LeadServiceType | null;
  panelModules?: number | null;
  isFirstOrder?: boolean;
}): number | null {
  if (input.serviceType === "online_consultation") {
    return input.isFirstOrder ? 0 : ONLINE_CONSULTATION_PRICE_RUB;
  }
  if (input.serviceType === "master_home_visit") {
    return MASTER_HOME_VISIT_PRICE_RUB;
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
  if (
    serviceType === "master_labeling" ||
    serviceType === "master_home_visit"
  ) {
    return "V";
  }
  return "O";
}
