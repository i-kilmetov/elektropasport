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
  title: "Пользовательское соглашение — Током",
};

const UPDATED = "1 сентября 2026 г.";

export default function TermsPage() {
  return (
    <LegalPageLayout title="Пользовательское соглашение" updatedAt={UPDATED}>
      <LegalSection title="1. Предмет">
        <p>
          Настоящее соглашение регулирует использование сервиса «
          {LEGAL_OPERATOR.serviceName}» ({LEGAL_OPERATOR.siteUrl}) — цифрового
          помощника для анализа домашних электрических щитков, оформления
          заявок и связи с мастерами.
        </p>
        <p>
          <strong>Администратор сервиса:</strong> {operatorContactLine()}.
        </p>
      </LegalSection>

      <LegalSection title="2. Регистрация">
        <p>
          Доступ к сохранению данных на сервере предоставляется после входа
          через Telegram и принятия документов сервиса. Вы подтверждаете, что
          указанные в Telegram данные принадлежат вам.
        </p>
        <p>
          Принимая документы сервиса, вы соглашаетесь на обработку и передачу
          номера телефона, даты рождения и адреса электронной почты в объёме,
          необходимом для регистрации, связи по заявкам и оказания услуг.
        </p>
      </LegalSection>

      <LegalSection title="3. Правила использования">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            не загружать материалы, нарушающие закон или права третьих лиц;
          </li>
          <li>
            понимать, что автоматический анализ щитка носит справочный характер
            и не заменяет осмотр квалифицированного электрика;
          </li>
          <li>
            не предпринимать действий, направленных на взлом или перегрузку
            сервиса.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Платные услуги">
        <p>
          Стоимость и порядок оказания платных услуг определяются{" "}
          <a href="/legal/offer" className="font-medium underline-offset-2 hover:underline">
            публичной офертой
          </a>
          . Оплата осуществляется через Robokassa.
        </p>
      </LegalSection>

      <LegalSection title="5. Интеллектуальная собственность">
        <p>
          Программный код, дизайн и материалы сервиса принадлежат
          администратору. Данные, созданные вами (схемы, фото щитков),
          остаются вашими; вы предоставляете администратору право хранить и
          обрабатывать их для работы сервиса.
        </p>
      </LegalSection>

      <LegalSection title="6. Ограничение ответственности">
        <p>
          Сервис предоставляется «как есть». Администратор не несёт
          ответственности за решения, принятые пользователем на основе
          справочных подсказок, и за работу сторонних сервисов (Telegram,
          платёжные системы, базы адресов).
        </p>
      </LegalSection>

      <LegalSection title="7. Изменения и связь">
        <p>
          Администратор вправе обновлять соглашение; актуальная версия
          публикуется на сайте. Вопросы:{" "}
          <a
            href={`mailto:${operatorEmail()}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {operatorEmail()}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
