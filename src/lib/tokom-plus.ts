/** «Током Плюс» — charged monthly subscription. */

export const TOKOM_PLUS_PRICE_RUB = 220;
export const TOKOM_PLUS_PERIOD_DAYS = 30;
/** 5% off master call services while Plus is active. */
export const TOKOM_PLUS_MASTER_DISCOUNT = 0.05;

export const TOKOM_PLUS_SERVICE_TYPE = "tokom_plus";

/** Free tier without Plus (or invite unlock). */
export const FREE_PANEL_LIMIT = 5;
export const FREE_APPLIANCE_LIMIT_PER_PANEL = 10;

export const TOKOM_PLUS_TAGLINE = "Заряженная подписка";

export const PANEL_LIMIT_MESSAGE_FREE =
  "Без подписки можно добавить до 5 щитков. Подключите Током Плюс — и лимитов не будет.";

export const APPLIANCE_LIMIT_MESSAGE_FREE =
  "Без подписки к щитку можно добавить до 10 видов техники. Подключите Током Плюс — и лимитов не будет.";

export function isTokomPlusActive(until: Date | string | null | undefined): boolean {
  if (!until) return false;
  const end = typeof until === "string" ? new Date(until) : until;
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > Date.now();
}

export function applyTokomPlusDiscount(
  amountRub: number,
  hasPlus: boolean,
): number {
  if (!hasPlus || amountRub <= 0) return amountRub;
  return Math.max(1, Math.round(amountRub * (1 - TOKOM_PLUS_MASTER_DISCOUNT)));
}

export function formatPlusUntil(until: string | null | undefined): string {
  if (!until) return "";
  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type TokomPlusFeatureRow = {
  label: string;
  free: string;
  plus: string;
};

export const TOKOM_PLUS_COMPARISON: TokomPlusFeatureRow[] = [
  {
    label: "Щитки",
    free: "до 5",
    plus: "без лимита",
  },
  {
    label: "Техника на щиток",
    free: "до 10 видов",
    plus: "без лимита",
  },
  {
    label: "Расключение проводами",
    free: "нет",
    plus: "да",
  },
  {
    label: "Скидка на вызов мастера",
    free: "—",
    plus: "5%",
  },
];
