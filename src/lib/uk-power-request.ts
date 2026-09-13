/** Letter template and helpers for requesting allocated power from UK. */

export type UkPowerRequestFields = {
  managementName: string;
  managementEmail: string;
  fullName: string;
  address: string;
  phone: string;
  replyEmail: string;
  accountNumber: string;
};

export type UkPowerRequestDraft = {
  to: string;
  subject: string;
  body: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function buildUkPowerRequestSubject(address: string): string {
  const addr = address.trim() || "адресу проживания";
  return `Запрос сведений о выделенной мощности по адресу: ${addr}`;
}

export function buildUkPowerRequestBody(fields: UkPowerRequestFields): string {
  const uk = fields.managementName.trim() || "управляющая организация";
  const name = fields.fullName.trim() || "________________";
  const address = fields.address.trim() || "________________";
  const phone = fields.phone.trim() || "________________";
  const email = fields.replyEmail.trim() || "________________";
  const account = fields.accountNumber.trim();

  const lines: string[] = [
    `Здравствуйте!`,
    ``,
    `Прошу предоставить сведения о выделенной электрической мощности (кВт) и числе фаз для жилого помещения по адресу:`,
    `${address}.`,
    ``,
  ];
  if (account) {
    lines.push(`Лицевой счёт / номер договора: ${account}.`, ``);
  }
  lines.push(
    `Информация нужна для корректного подбора защитных аппаратов и оценки электробезопасности квартиры (сервис Током, https://tokom.ru).`,
    ``,
    `Прошу сообщить:`,
    `1) выделенную (разрешённую) мощность по договору энергоснабжения / акту технологического присоединения, кВт;`,
    `2) число фаз (1 или 3);`,
    `3) при наличии — реквизиты договора или акта, из которого взяты эти данные.`,
    ``,
    `Ответ прошу направить на электронную почту: ${email}`,
    `или связаться по телефону: ${phone}.`,
    ``,
    `С уважением,`,
    `${name}`,
    ``,
    `—`,
    `Письмо сформировано в сервисе Током для обращения в ${uk}.`,
  );
  return lines.join("\n");
}

export function buildUkPowerRequestDraft(
  fields: UkPowerRequestFields,
): UkPowerRequestDraft {
  return {
    to: fields.managementEmail.trim(),
    subject: buildUkPowerRequestSubject(fields.address),
    body: buildUkPowerRequestBody(fields),
  };
}

/** Build a mailto: URL for fallback when server email is not configured. */
export function buildMailtoHref(draft: UkPowerRequestDraft): string {
  const params = new URLSearchParams();
  params.set("subject", draft.subject);
  params.set("body", draft.body);
  return `mailto:${draft.to}?${params.toString()}`;
}

export function openMailtoDraft(draft: UkPowerRequestDraft): void {
  if (typeof window === "undefined") return;
  window.location.href = buildMailtoHref(draft);
}
