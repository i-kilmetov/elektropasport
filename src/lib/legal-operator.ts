/** Operator of the Tokom service (152-FZ). */
export const LEGAL_OPERATOR = {
  fullName: "Кильметов Ильдар Ринатович",
  status: "самозанятый (плательщик налога на профессиональный доход)",
  serviceName: "Током",
  siteUrl: "https://tokom.ru",
  siteHost: "tokom.ru",
} as const;

export function operatorInn(): string {
  return process.env.OPERATOR_INN?.trim() || "026808950600";
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

export const LEGAL_DOCUMENTS = [
  {
    href: "/legal/offer",
    title: "Публичная оферта",
    description: "Условия оказания услуг, оплата и возвраты",
  },
  {
    href: "/legal/school",
    title: "Условия обучающего курса",
    description: "Школа Током: доступ, оплата и отказ от возврата",
  },
  {
    href: "/legal/privacy",
    title: "Политика конфиденциальности",
    description: "Как обрабатываются персональные данные (152-ФЗ)",
  },
  {
    href: "/legal/terms",
    title: "Пользовательское соглашение",
    description: "Правила использования сервиса Током",
  },
  {
    href: "/legal/consent",
    title: "Согласие на обработку персональных данных",
    description: "Текст согласия, которое вы даёте при входе",
  },
] as const;
