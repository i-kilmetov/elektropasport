/** Operator of the Tokom service (152-FZ). */
export const LEGAL_OPERATOR = {
  fullName: "Кильметов Ильдар Ринатович",
  status: "самозанятый (плательщик налога на профессиональный доход)",
  serviceName: "Током",
  siteUrl: "https://tokom.ru",
  siteHost: "tokom.ru",
} as const;

export function operatorInn(): string {
  return process.env.OPERATOR_INN?.trim() || "";
}

export function operatorEmail(): string {
  return (
    process.env.OPERATOR_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_OPERATOR_EMAIL?.trim() ||
    "support@tokom.ru"
  );
}

export function operatorContactLine(): string {
  const inn = operatorInn();
  const parts = [
    LEGAL_OPERATOR.fullName,
    LEGAL_OPERATOR.status,
    inn ? `ИНН ${inn}` : null,
    operatorEmail(),
  ].filter(Boolean);
  return parts.join(", ");
}
