import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";
import {
  LEGAL_OPERATOR,
  operatorContactLine,
  operatorEmail,
} from "@/lib/legal-operator";

export const metadata: Metadata = {
  title: "Публичная оферта — Током",
};

const UPDATED = "1 сентября 2026 г.";

export default function OfferPage() {
  return (
    <LegalPageLayout title="Публичная оферта на оказание услуг" updatedAt={UPDATED}>
      <LegalSection title="1. Исполнитель">
        <p>{operatorContactLine()}.</p>
        <p>
          E-mail:{" "}
          <a href={`mailto:${operatorEmail()}`} className="font-medium underline-offset-2 hover:underline">
            {operatorEmail()}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Предмет оферты">
        <p>
          Исполнитель оказывает информационные и консультационные услуги в
          области бытовой электрики через сервис «{LEGAL_OPERATOR.serviceName}»,
          включая онлайн-консультации, помощь в подборе решений, организацию
          выезда мастера (при наличии соответствующей услуги на сайте).
        </p>
      </LegalSection>

      <LegalSection title="3. Акцепт">
        <p>
          Акцептом оферты считается оплата услуги на сайте или оформление заявки
          с последующей оплатой. Договор считается заключённым с момента акцепта.
        </p>
      </LegalSection>

      <LegalSection title="4. Стоимость и оплата">
        <p>
          Стоимость услуг указывается на сайте до оплаты. Оплата производится
          безналично через Robokassa (СБП, банковская карта и иные способы в
          платёжной форме). Исполнитель
          применяет специальный налоговый режим «Налог на профессиональный
          доход»; чек направляется в приложение «Мой налог» и/или на e-mail
          плательщика.
        </p>
      </LegalSection>

      <LegalSection title="5. Порядок оказания">
        <p>
          После оплаты услуга оказывается в срок, согласованный на сайте или с
          пользователем по контактам из заявки. Консультации могут проводиться
          дистанционно (Telegram, телефон).
        </p>
      </LegalSection>

      <LegalSection title="6. Возврат">
        <p>
          Возврат возможен до начала оказания услуги либо при существенном
          нарушении со стороны Исполнителя. Запрос направляется на{" "}
          <a href={`mailto:${operatorEmail()}`} className="font-medium underline-offset-2 hover:underline">
            {operatorEmail()}
          </a>{" "}
          с указанием номера платежа.
        </p>
      </LegalSection>

      <LegalSection title="7. Прочее">
        <p>
          К отношениям сторон применяется законодательство Российской
          Федерации. Споры решаются путём переговоров, при недостижении
          соглашения — в суде по месту нахождения Исполнителя.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
