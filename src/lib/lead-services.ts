import type { Device } from "@/types";
import { deviceModules } from "@/lib/panel-rails";

export const ONLINE_CONSULTATION_PRICE_RUB = 499;
export const MODULE_LABELING_PRICE_RUB = 500;
export const MASTER_HOME_VISIT_PRICE_RUB = 2990;
/** Выезд для проверки расключения: 1000 ₽ за модуль, минимум 5000 ₽. */
export const WIRING_CHECK_PRICE_PER_MODULE_RUB = 1000;
export const WIRING_CHECK_MIN_PRICE_RUB = 5000;

export type LeadServiceType =
  | "online_consultation"
  | "master_home_visit"
  | "master_labeling"
  | "master_wiring_check"
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

/** Lowercased city name for matching masters to the user's city. */
export function cityMatchKey(city: string): string {
  return normalizeCityName(city)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/^г\.?\s+/, "")
    .replace(/^город\s+/, "");
}

export function masterLabelingPriceRub(moduleCount: number): number {
  return Math.max(0, moduleCount) * MODULE_LABELING_PRICE_RUB;
}

export function wiringCheckVisitPriceRub(moduleCount: number): number {
  return Math.max(
    WIRING_CHECK_MIN_PRICE_RUB,
    Math.max(0, moduleCount) * WIRING_CHECK_PRICE_PER_MODULE_RUB,
  );
}

export function getLeadServiceLabel(type: LeadServiceType): string {
  switch (type) {
    case "online_consultation":
      return "Онлайн-консультация";
    case "master_home_visit":
      return "Вызов мастера на дом";
    case "master_labeling":
      return "Вызов мастера для прозвонки и маркировки";
    case "master_wiring_check":
      return "Проверка расключения щитка";
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
  if (input.serviceType === "master_wiring_check" && input.panelModules) {
    const price =
      input.estimatedPriceRub ?? wiringCheckVisitPriceRub(input.panelModules);
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
  hasConnectedMaster: boolean;
}): LeadServiceOption[] {
  if (input.hasConnectedMaster) {
    return [
      {
        id: "master_home_visit",
        title: "Вызов мастера на дом",
        description:
          "Поиск мастера занимает в среднем не больше минуты. Мастера ищем в реальном времени среди подключенных в вашем городе.",
        priceLabel: formatRub(MASTER_HOME_VISIT_PRICE_RUB),
        priceRub: MASTER_HOME_VISIT_PRICE_RUB,
      },
    ];
  }

  return [
    {
      id: "online_consultation",
      title: "Онлайн-консультация",
      description:
        "Разберём щиток по фото и схеме на связи: что можно сделать самим и где уже нужен специалист.",
      priceLabel: formatRub(ONLINE_CONSULTATION_PRICE_RUB),
      priceRub: ONLINE_CONSULTATION_PRICE_RUB,
    },
  ];
}

export function payableAmountRub(input: {
  serviceType?: LeadServiceType | null;
  panelModules?: number | null;
  isFirstOrder?: boolean;
}): number | null {
  if (input.serviceType === "online_consultation") {
    return ONLINE_CONSULTATION_PRICE_RUB;
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
  if (
    input.serviceType === "master_wiring_check" &&
    typeof input.panelModules === "number" &&
    input.panelModules > 0
  ) {
    return wiringCheckVisitPriceRub(input.panelModules);
  }
  if (input.serviceType === "master_wiring_check") {
    return WIRING_CHECK_MIN_PRICE_RUB;
  }
  return null;
}

export function resolveRequestTypeCodeForService(
  serviceType: LeadServiceType,
): "C" | "V" | "O" {
  if (serviceType === "online_consultation") return "C";
  if (
    serviceType === "master_labeling" ||
    serviceType === "master_home_visit" ||
    serviceType === "master_wiring_check"
  ) {
    return "V";
  }
  return "O";
}
