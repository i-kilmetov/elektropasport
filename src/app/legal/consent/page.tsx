import type { Metadata } from "next";
import {
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/legal-page-layout";
import { LEGAL_OPERATOR, operatorContactLine } from "@/lib/legal-operator";
import { PD_CONSENT_VERSION } from "@/lib/pd-consent";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных — Током",
};

const UPDATED = "25 августа 2026 г.";

export default function ConsentPage() {
  return (
    <LegalPageLayout
      title="Согласие на обработку персональных данных"
      updatedAt={UPDATED}
    >
      <LegalSection title="Оператор">
        <p>{operatorContactLine()}.</p>
      </LegalSection>

      <LegalSection title="Текст согласия">
        <p>
          Я, пользователь сервиса «{LEGAL_OPERATOR.serviceName}», свободно, своей
          волей и в своём интересе даю согласие {LEGAL_OPERATOR.fullName}{" "}
          (оператор персональных данных) на обработку моих персональных данных
          на следующих условиях:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Перечень данных:</strong> идентификатор и профиль Telegram,
            имя, номер телефона, дата рождения, адрес электронной почты, адрес
            объекта, данные об электрическом щитке и заявках, технические данные
            сессии.
          </li>
          <li>
            <strong>Цели:</strong> регистрация, хранение щитков и заявок,
            анализ безопасности, связь по услугам, оплата, исполнение
            законодательства РФ.
          </li>
          <li>
            <strong>Действия:</strong> сбор, запись, систематизация, хранение,
            уточнение, использование, передача (в т.ч. Telegram, ЮKassa,
            сервисы адресов, исполнителям услуг — в необходимом объёме),
            обезличивание, удаление.
          </li>
          <li>
            <strong>Контактные данные:</strong> я соглашаюсь на обработку и
            передачу номера телефона, даты рождения и адреса электронной почты
            в объёме, необходимом для регистрации, связи по заявкам и оказания
            услуг сервиса.
          </li>
          <li>
            <strong>Срок:</strong> до достижения целей обработки или отзыва
            согласия.
          </li>
          <li>
            <strong>Локализация:</strong> хранение данных граждан РФ на
            серверах в Российской Федерации.
          </li>
        </ul>
        <p>
          Согласие может быть отозвано путём направления обращения оператору.
          Отзыв не затрагивает законность обработки до момента отзыва.
        </p>
        <p className="text-[13px] text-zinc-500">
          Версия документа: {PD_CONSENT_VERSION}
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
