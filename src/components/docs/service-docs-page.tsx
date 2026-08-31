"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Обзор" },
  { id: "actors", label: "Роли и акторы" },
  { id: "requirements", label: "Бизнес-требования" },
  { id: "journeys", label: "Сценарии пользователя" },
  { id: "screens", label: "Экраны приложения" },
  { id: "auth", label: "Авторизация" },
  { id: "limits", label: "Лимит щитков и инвайты" },
  { id: "ai", label: "Анализ фото (AI)" },
  { id: "address", label: "Адрес и данные дома" },
  { id: "leads", label: "Заявки и услуги" },
              { id: "payments", label: "Оплата" },
  { id: "masters", label: "Мастера" },
  { id: "storage", label: "Где что хранится" },
  { id: "api", label: "API" },
  { id: "integrations", label: "Внешние сервисы" },
  { id: "admin", label: "Админка" },
  { id: "legal", label: "Юридическое" },
  { id: "architecture", label: "Архитектура" },
] as const;

function NavLink({
  id,
  label,
  active,
}: {
  id: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={`#${id}`}
      className={`block rounded-lg px-3 py-1.5 ty-note transition ${
        active
          ? "bg-zinc-900 font-medium text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {label}
    </a>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 border-b border-zinc-200 pb-3 font-[family-name:var(--font-geologica)] text-[28px] font-medium tracking-tight text-zinc-900"
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-8 ty-title">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 ty-body text-zinc-700">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 ty-body text-zinc-700">
      {children}
    </ul>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 font-semibold text-zinc-800"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 align-top text-zinc-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
      <div className="ty-label text-amber-900">{title}</div>
      <div className="mt-1 ty-body text-amber-950/80">
        {children}
      </div>
    </div>
  );
}

function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 ty-badge text-zinc-800">
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-zinc-300" aria-hidden>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[12px] text-zinc-800">
      {children}
    </code>
  );
}

function MermaidishBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="ty-label">{title}</div>
      <ul className="mt-2 space-y-1 text-[13px] text-zinc-600">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ServiceDocsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4, 0.7] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-dvh bg-[#f4f4f5] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[#f4f4f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-geologica)] text-[18px] text-zinc-900">
              Током · документация сервиса
            </p>
            <p className="truncate ty-note">
              tokom.ru · бизнес-логика, данные, API
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 ty-label lg:hidden"
              onClick={() => setNavOpen((v) => !v)}
            >
              Разделы
            </button>
            <Link
              href="/"
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 ty-label text-zinc-800"
            >
              На главную
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-0 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pb-20 lg:pt-8">
        <aside
          className={`${
            navOpen ? "block" : "hidden"
          } border-b border-zinc-200 bg-white px-3 py-3 lg:sticky lg:top-[68px] lg:block lg:h-[calc(100dvh-84px)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-zinc-200 lg:bg-white lg:px-3 lg:py-4`}
        >
          <nav className="space-y-0.5" aria-label="Разделы документации">
            {SECTIONS.map((s) => (
              <NavLink
                key={s.id}
                id={s.id}
                label={s.label}
                active={active === s.id}
              />
            ))}
          </nav>
        </aside>

        <main className="px-4 py-8 lg:px-0 lg:py-0">
          <article className="space-y-14 rounded-[28px] border border-zinc-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
            <section>
              <H2 id="overview">Обзор</H2>
              <P>
                <strong>Током</strong> (tokom.ru) — сервис самодиагностики
                домашней электрики и помощи с щитком. Пользователь фотографирует
                щиток, получает интерактивную схему автоматов, оценку
                безопасности, справку по дому и может заказать консультацию или
                вызов мастера.
              </P>
              <P>
                Продукт работает как <strong>Telegram Mini App</strong> и как
                обычный сайт в браузере. Код: Next.js (App Router) + React,
                API-роуты на том же деплое (Vercel), данные — PostgreSQL
                (предпочтительно российский хост для 152-ФЗ).
              </P>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MermaidishBox
                  title="Клиент"
                  items={[
                    "React SPA в AppShell",
                    "Telegram WebApp / браузер",
                    "localStorage-кеш",
                  ]}
                />
                <MermaidishBox
                  title="Сервер"
                  items={[
                    "Next.js Route Handlers",
                    "Авторизация Telegram",
                    "Бизнес-правила и квоты",
                  ]}
                />
                <MermaidishBox
                  title="Данные и сервисы"
                  items={[
                    "PostgreSQL (RU / Neon)",
                    "Qwen VL, DaData, data.mos.ru",
                    "ЮKassa СБП, Telegram Bot",
                  ]}
                />
              </div>
              <Callout title="Точка входа в код">
                Маршрутизация экранов: <Code>src/components/app-shell.tsx</Code>.
                Типы экранов и сущностей: <Code>src/types/index.ts</Code>. Схема
                БД: <Code>src/lib/db.ts</Code>.
              </Callout>
            </section>

            <section>
              <H2 id="actors">Роли и акторы</H2>
              <Table
                headers={["Роль", "Кто это", "Что может"]}
                rows={[
                  [
                    "Пользователь",
                    "Владелец квартиры / дома",
                    "Щитки, заявки, профиль, приглашения, оплата услуг",
                  ],
                  [
                    "Мастер",
                    "users.role = master",
                    "Принимать заявки в Telegram, смотреть назначенные заказы и щиток клиента",
                  ],
                  [
                    "Админ",
                    "TELEGRAM_ADMIN_CHAT_ID или is_admin",
                    "Дашборд, роли, статусы заявок, админы; уведомления в Telegram",
                  ],
                  [
                    "Гость / без сервера",
                    "Нет Telegram-сессии",
                    "Локальный список в localStorage; серверные функции недоступны",
                  ],
                ]}
              />
            </section>

            <section>
              <H2 id="requirements">Бизнес-требования</H2>
              <H3>Функциональные</H3>
              <Ul>
                <li>
                  Оцифровка щитка по фото: список устройств, DIN-рейки, схема,
                  оценка безопасности.
                </li>
                <li>
                  Редактирование схемы: подписи цепей, каталог, провода между
                  клеммами, стикеры.
                </li>
                <li>
                  Привязка адреса и справки по дому (год, заземление, капремонт —
                  для Москвы).
                </li>
                <li>
                  Ограничение «1 щиток бесплатно»; снятие лимита через
                  приглашение <em>нового</em> пользователя.
                </li>
                <li>
                  Заявки на консультацию / проектирование / сборку / монтаж /
                  вызов мастера с публичным кодом.
                </li>
                <li>
                  Оплата фиксированных услуг через СБП (ЮKassa), создание заявки
                  после подтверждения платежа.
                </li>
                <li>
                  Диспетчеризация заявки мастерам в Telegram; первый принявший
                  получает контакты.
                </li>
                <li>
                  Личный кабинет: ФИО, телефон, email, ДР; плашка лимита и список
                  приглашённых.
                </li>
                <li>
                  Согласие на обработку ПДн перед браузерным входом; юридические
                  страницы.
                </li>
                <li>
                  Админ-панель и Telegram-бот для оператора сервиса.
                </li>
              </Ul>
              <H3>Нефункциональные</H3>
              <Ul>
                <li>
                  Персональные данные пользователей РФ — предпочтительно в БД на
                  территории РФ (<Code>RU_DATABASE_URL</Code>).
                </li>
                <li>
                  Синхронизация между устройствами через сервер при авторизации
                  Telegram.
                </li>
                <li>
                  Graceful degradation: при недоступности API показываем
                  локальный кеш, не затираем данные пустым ответом.
                </li>
                <li>
                  Staging <Code>test.tokom.ru</Code> закрыт паролем; там же
                  превью функций (например, бытовая техника).
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="journeys">Сценарии пользователя</H2>

              <H3>A. Оцифровка щитка</H3>
              <Flow
                steps={[
                  "Главная",
                  "Фото",
                  "Анализ AI",
                  "Схема",
                  "Адрес / правки",
                ]}
              />
              <P>
                После анализа создаётся панель на сервере (если есть auth). Фото
                сохраняется в <Code>panels.photo_data_url</Code>. Устройства —
                JSONB <Code>devices</Code>.
              </P>

              <H3>B. Нет щитка / нужен монтаж</H3>
              <Flow
                steps={[
                  "Варианты ситуации",
                  "Детали",
                  "Преимущества",
                  "Город",
                  "Адрес",
                  "Дом",
                  "Услуга",
                  "Контакты / оплата",
                ]}
              />

              <H3>C. Нужна помощь с электрикой</H3>
              <Flow
                steps={[
                  "Тип заявки",
                  "Город",
                  "Адрес",
                  "Дом",
                  "Услуга",
                  "Контакты",
                ]}
              />

              <H3>D. Вызов мастера со схемы</H3>
              <Flow
                steps={[
                  "Схема",
                  "Лид",
                  "Оплата (если нужно)",
                  "Поиск 60с",
                  "Успех / не найден",
                ]}
              />

              <H3>E. Вход с браузера</H3>
              <Flow
                steps={[
                  "Согласие ПДн",
                  "OAuth Telegram",
                  "Callback",
                  "Сессия",
                  "Главная",
                ]}
              />

              <H3>F. Стать мастером</H3>
              <Flow
                steps={[
                  "Анкета",
                  "Город",
                  "О себе",
                  "Контакт",
                  "Одобрение админом",
                ]}
              />
            </section>

            <section>
              <H2 id="screens">Экраны приложения</H2>
              <P>
                Все экраны — состояния <Code>AppScreen</Code> внутри одного
                клиентского shell, без отдельных URL (кроме отдельных лендингов).
              </P>
              <Table
                headers={["Экран", "Назначение"]}
                rows={[
                  ["welcome", "Онбординг"],
                  ["objects", "Главная: щитки и заявки (или кабинет мастера)"],
                  ["photo / analysis / scheme", "Съёмка → AI → схема щитка"],
                  [
                    "no-panel-* / panel-advantages / electrical-details",
                    "Сценарий «нет щитка»",
                  ],
                  [
                    "city-select / address-select / lead-service",
                    "Город, адрес, справка по дому",
                  ],
                  ["lead-service / lead-contact", "Выбор услуги и контакты"],
                  ["request-type / request-details", "Тип заявки и карточка статуса"],
                  ["profile", "ЛК: профиль, лимит, инвайты, выход"],
                  ["telegram-auth", "Вход через Telegram в браузере"],
                  [
                    "master-search / master-success / master-not-found",
                    "Ожидание мастера",
                  ],
                  ["become-master / master-about", "Заявка стать мастером"],
                  ["admin", "Админ-дашборд"],
                  ["feedback / about-service / panel-game / electrical-rules", "Сервисные экраны"],
                  ["research-survey", "Скрытый опрос (research)"],
                ]}
              />
              <H3>Отдельные маршруты сайта</H3>
              <Table
                headers={["URL", "Назначение"]}
                rows={[
                  ["/", "Приложение"],
                  ["/docs", "Внутренняя документация (Telegram → пароль)"],
                  ["/job", "Лендинг «стать мастером»"],
                  ["/research", "Опрос"],
                  ["/moscow-status", "Диагностика open data Москвы"],
                  ["/test-login", "Вход на staging"],
                  ["/legal/*", "privacy, consent, terms, offer"],
                  ["/auth/telegram/callback", "OAuth callback"],
                ]}
              />
            </section>

            <section>
              <H2 id="auth">Авторизация</H2>
              <H3>Telegram Mini App</H3>
              <Ul>
                <li>
                  Клиент берёт <Code>Telegram.WebApp.initData</Code>.
                </li>
                <li>
                  Заголовок: <Code>Authorization: tma &lt;initData&gt;</Code>.
                </li>
                <li>
                  Сервер проверяет HMAC-SHA256 по правилам Telegram (секрет =
                  SHA256(BOT_TOKEN)), срок <Code>auth_date</Code> — до 24 часов.
                </li>
              </Ul>
              <H3>Браузер</H3>
              <Ul>
                <li>
                  На экране входа только логотип и кнопка «Войти» (без галочки).
                </li>
                <li>
                  <Code>GET /api/auth/telegram/start</Code> → oauth.telegram.org.
                </li>
                <li>
                  Callback кладёт в localStorage токен сессии (
                  <Code>elektropasport:auth-token</Code>) и пользователя.
                </li>
                <li>
                  После входа показывается окно согласия на ПДн и cookie (
                  <Code>PdConsentGate</Code>) →{" "}
                  <Code>POST /api/auth/consent</Code>.
                </li>
                <li>
                  API: <Code>Authorization: Bearer &lt;token&gt;</Code>. Токен —
                  HMAC, TTL 30 дней (<Code>AUTH_SECRET</Code> или{" "}
                  <Code>BOT_TOKEN</Code>).
                </li>
              </Ul>
              <Callout title="Порядок на сервере">
                <Code>requireTelegramUser</Code>: сначала initData (tma), затем
                Bearer. Иначе 401.
              </Callout>
            </section>

            <section>
              <H2 id="limits">Лимит щитков и инвайты</H2>
              <Ul>
                <li>
                  Базовый лимит: <strong>1 щиток</strong> на аккаунт.
                </li>
                <li>
                  Лимит снимается только если приглашённый{" "}
                  <strong>ещё не был зарегистрирован</strong> (outcome ={" "}
                  <Code>credited</Code>).
                </li>
                <li>
                  Если человек уже был в сервисе — событие{" "}
                  <Code>already_member</Code>, лимит не снимается.
                </li>
                <li>
                  Флаг <Code>users.panel_limit_unlocked</Code> хранится на
                  сервере; события — в <Code>invite_events</Code>.
                </li>
                <li>
                  В ЛК плашка «Безлимит / Снять лимит» открывает список
                  приглашённых со статусами.
                </li>
                <li>
                  Токен приглашения: <Code>i</Code> + 8–16 символов, в{" "}
                  <Code>users.invite_token</Code>.
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="ai">Анализ фото (AI)</H2>
              <Flow
                steps={[
                  "Фото (data URL)",
                  "POST /api/analyze-panel",
                  "Qwen VL (DashScope)",
                  "Нормализация устройств",
                  "Схема",
                ]}
              />
              <Ul>
                <li>
                  Модель по умолчанию: цепочка qwen3-vl-plus → flash → max.
                </li>
                <li>
                  Ответ: устройства (типы автоматов/УЗО и т.д.),{" "}
                  <Code>railCount</Code>, <Code>linesCount</Code>, черновой
                  safety score.
                </li>
                <li>
                  Итоговая оценка безопасности уточняется на клиенте с учётом
                  фаз, мощности и заземления.
                </li>
                <li>
                  Ключ: <Code>DASHSCOPE_API_KEY</Code> (только сервер).
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="address">Адрес и данные дома</H2>
              <Table
                headers={["Шаг", "API / источник", "Результат"]}
                rows={[
                  [
                    "Подсказки адреса",
                    "POST /api/address-suggest → DaData",
                    "Список адресов (для Москвы — фильтр KLADR)",
                  ],
                  [
                    "Справка по дому",
                    "POST /api/house-lookup",
                    "Год, ожидание заземления, капремонт (Москва)",
                  ],
                  [
                    "Open data Москвы",
                    "apidata.mos.ru (+ опциональный RU-прокси)",
                    "Паспорт дома / капремонт",
                  ],
                ]}
              />
              <P>
                Снимок дома сохраняется в панели:{" "}
                <Code>panels.house_snapshot</Code> (JSONB) + текстовый{" "}
                <Code>address</Code>.
              </P>
            </section>

            <section>
              <H2 id="leads">Заявки и услуги</H2>
              <P>
                Заявка (<Code>install_requests</Code>) создаётся после контактов
                или после успешной оплаты. Публичный код вида{" "}
                <Code>C-0001</Code> выделяется счётчиком{" "}
                <Code>request_code_counters</Code>.
              </P>
              <Table
                headers={["Код", "Смысл"]}
                rows={[
                  ["C", "Консультация"],
                  ["P", "Проектирование"],
                  ["S", "Сборка"],
                  ["M", "Монтаж"],
                  ["V", "Вызов мастера / маркировка"],
                  ["F / L / I / O", "Сценарии «нет щитка»"],
                  ["U", "Запасной / неизвестный"],
                ]}
              />
              <H3>Статусы заявки</H3>
              <Ul>
                <li>
                  <Code>new</Code> → <Code>in_progress</Code> →{" "}
                  <Code>done</Code> / <Code>cancelled</Code>
                </li>
                <li>
                  Статус меняет админ (дашборд / кнопки в Telegram) или мастер
                  при принятии.
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="payments">Оплата</H2>
              <Ul>
                <li>
                  Провайдер: <strong>ЮKassa</strong> (для самозанятых).
                </li>
                <li>
                  Услуги мастера: онлайн-консультация 499 ₽; вызов мастера — по
                  тарифу выезда. Услуга «другое» без фиксцены — без оплаты.
                  <Code>POST /api/payments/sbp</Code> создаёт платёж СБП.
                </li>
                <li>
                  Школа Током: <Code>POST /api/payments/school</Code> создаёт
                  оплату класса (карта / СБП / другие методы магазина). Доступ
                  пишется в <Code>users.school_paid_grades</Code>. Клиент читает
                  его через <Code>GET /api/school/access</Code>.
                </li>
                <li>
                  Подтверждение: webhook{" "}
                  <Code>/api/payments/yookassa-notify</Code> или опрос{" "}
                  <Code>GET /api/payments/sbp/[id]</Code>.
                </li>
                <li>
                  После <Code>confirmed</Code> для услуг мастера создаётся заявка
                  из <Code>lead_payload</Code>; для школы открывается класс.
                  Админ получает уведомление.
                </li>
                <li>
                  Таблица <Code>sbp_payments</Code> (колонка{" "}
                  <Code>tbank_payment_id</Code> — legacy-имя, хранит id ЮKassa).
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="masters">Мастера</H2>
              <Flow
                steps={[
                  "Заявка создана",
                  "POST /api/master/dispatch",
                  "Сообщения мастерам",
                  "Первый «Принять»",
                  "Контакты победителю",
                ]}
              />
              <Ul>
                <li>
                  В рассылке адрес без квартиры; телефон — только после принятия.
                </li>
                <li>
                  Принятие атомарно:{" "}
                  <Code>UPDATE … WHERE master_telegram_id IS NULL</Code>.
                </li>
                <li>
                  Остальным сообщения правятся на «уже принял другой».
                </li>
                <li>
                  Клиент 60 секунд поллит{" "}
                  <Code>/api/master/request-status</Code>.
                </li>
                <li>
                  Заявка мастера: <Code>master_applications</Code> → одобрение
                  админом в Telegram → <Code>role=master</Code>.
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="storage">Где что хранится</H2>
              <H3>PostgreSQL (сервер)</H3>
              <Table
                headers={["Таблица", "Что внутри"]}
                rows={[
                  [
                    "users",
                    "Telegram id, профиль, invite_token, role, is_admin, panel_limit_unlocked, pd_consent, school_paid_grades",
                  ],
                  [
                    "panels",
                    "Щиток: адрес, devices/wires/appliances JSON, фото, house_snapshot, safety…",
                  ],
                  [
                    "install_requests",
                    "Заявки, контакты, оплата, master_telegram_id, panel_id, public_code",
                  ],
                  [
                    "invite_events",
                    "Кто кого пригласил, credited / already_member",
                  ],
                  ["panel_shares", "Токены шаринга щитка"],
                  ["sbp_payments", "Платежи ЮKassa: услуги мастера и школа"],
                  [
                    "master_applications / master_feedback / master_dispatch_messages",
                    "Анкеты, фидбек, Telegram message ids",
                  ],
                  [
                    "request_code_counters / waitlist / schema_meta",
                    "Счётчики кодов, waitlist, версии схемы",
                  ],
                ]}
              />
              <Callout title="Приоритет БД">
                Сначала <Code>RU_DATABASE_URL</Code>, иначе{" "}
                <Code>DATABASE_URL</Code>. Схема поднимается автоматически в{" "}
                <Code>ensureSchema()</Code>.
              </Callout>

              <H3>Клиент (localStorage / cookie)</H3>
              <Table
                headers={["Ключ", "Назначение"]}
                rows={[
                  [
                    "elektropasport:home-items",
                    "Кеш щитков и заявок (offline / stale-while-revalidate)",
                  ],
                  [
                    "elektropasport:auth-token / auth-user",
                    "Сессия браузера",
                  ],
                  [
                    "elektropasport:user-profile (+ pending)",
                    "Кеш профиля и очередь на sync",
                  ],
                  [
                    "ep_pd_consent (cookie)",
                    "Краткое согласие ПДн перед OAuth",
                  ],
                  [
                    "ep_pending_install_lead / ep_pending_panel_share",
                    "Черновики до завершения auth",
                  ],
                  [
                    "elektropasport:scheme-tour-…",
                    "Онбординг схемы по щитку",
                  ],
                ]}
              />
              <P>
                Правило синхронизации: сервер — источник истины при успешном
                fetch; локальные «сироты» догружаются на сервер; при ошибке
                сервера локальный кеш не затирается.
              </P>
            </section>

            <section>
              <H2 id="api">API</H2>
              <P>
                Все пути относительно origin (например{" "}
                <Code>https://tokom.ru</Code>). «Auth» = Telegram initData или
                Bearer.
              </P>

              <H3>Данные пользователя</H3>
              <Table
                headers={["Метод", "Путь", "Зачем"]}
                rows={[
                  ["GET", "/api/items", "Список щитков + заявок"],
                  ["POST", "/api/panels", "Создать/upsert щиток (квота)"],
                  ["PATCH/DELETE", "/api/panels/[id]", "Патч / удаление"],
                  ["POST", "/api/panels/[id]/share", "Ссылка на щиток"],
                  ["GET", "/api/shares/[token]", "Открыть расшаренный щиток"],
                  ["GET/PUT", "/api/profile", "Профиль"],
                  ["GET", "/api/invites", "Квота + URL + события"],
                  ["POST", "/api/invites/claim", "Зачесть инвайт"],
                ]}
              />

              <H3>Заявки, мастера, оплата</H3>
              <Table
                headers={["Метод", "Путь", "Зачем"]}
                rows={[
                  ["POST", "/api/install-requests", "Создать заявку"],
                  ["PATCH/DELETE", "/api/install-requests/[id]", "Обновить / удалить"],
                  ["POST", "/api/install-requests/next-code", "Следующий код"],
                  ["POST", "/api/master-applications", "Заявка мастера"],
                  ["POST", "/api/master/dispatch", "Разослать мастерам"],
                  ["GET", "/api/master/requests", "Заказы мастера"],
                  ["GET", "/api/master/requests/[id]/panel", "Щиток клиента"],
                  ["GET", "/api/master/request-status", "Поллинг принятия"],
                  ["GET", "/api/master/profile", "Профиль мастера"],
                  ["POST", "/api/master/feedback", "Фидбек"],
                  ["POST", "/api/payments/sbp", "Создать СБП"],
                  ["GET", "/api/payments/sbp/[id]", "Статус платежа"],
                  ["POST", "/api/payments/school", "Оплата класса школы"],
                  ["GET", "/api/school/access", "Оплаченные классы"],
                  ["POST", "/api/payments/yookassa-notify", "Webhook ЮKassa"],
                ]}
              />

              <H3>Адрес, AI, auth, прочее</H3>
              <Table
                headers={["Метод", "Путь", "Зачем"]}
                rows={[
                  ["POST", "/api/address-suggest", "Подсказки DaData"],
                  ["POST", "/api/house-lookup", "Справка по дому"],
                  ["GET", "/api/moscow-open-data/*", "Ключ / статус MOS"],
                  ["POST", "/api/analyze-panel", "AI-разбор фото"],
                  ["GET/POST", "/api/auth/telegram", "Сессия / widget"],
                  ["GET", "/api/auth/telegram/start", "Старт OAuth"],
                  ["GET/POST/DELETE", "/api/auth/consent", "Согласие ПДн"],
                  ["GET", "/api/admin/*", "Админ API"],
                  ["POST", "/api/feedback(+attachment)", "Обратная связь"],
                  ["POST", "/api/waitlist", "Листы ожидания"],
                  ["POST", "/api/research-survey", "Опрос → Sheets"],
                  ["GET", "/api/stats", "Публичные счётчики"],
                  ["POST", "/api/telegram/webhook", "Колбэки бота"],
                ]}
              />
            </section>

            <section>
              <H2 id="integrations">Внешние сервисы</H2>
              <Table
                headers={["Сервис", "Переменные", "Роль"]}
                rows={[
                  [
                    "Telegram Bot + OAuth",
                    "BOT_TOKEN, TELEGRAM_CLIENT_*, TELEGRAM_ADMIN_CHAT_ID",
                    "Auth, уведомления, диспетчеризация",
                  ],
                  [
                    "PostgreSQL",
                    "RU_DATABASE_URL / DATABASE_URL",
                    "Основное хранилище",
                  ],
                  [
                    "DashScope Qwen VL",
                    "DASHSCOPE_API_KEY",
                    "Распознавание щитка",
                  ],
                  ["DaData", "DADATA_API_KEY", "Подсказки адресов"],
                  [
                    "data.mos.ru",
                    "MOS_DATA_API_KEY, MOS_DATA_HTTPS_PROXY",
                    "Паспорт дома / капремонт",
                  ],
                  [
                    "ЮKassa",
                    "YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY",
                    "СБП услуг и оплата школы",
                  ],
                  [
                    "Google Sheets",
                    "GOOGLE_SHEETS_*",
                    "Research-опрос",
                  ],
                ]}
              />
            </section>

            <section>
              <H2 id="admin">Админка</H2>
              <Ul>
                <li>
                  Вход: экран <Code>admin</Code> из профиля, если{" "}
                  <Code>/api/admin/me</Code> вернул isAdmin.
                </li>
                <li>
                  Возможности: статистика, пользователи (роль user/master),
                  заявки (статус), мастера и анкеты, список админов.
                </li>
                <li>
                  Параллельно бот шлёт лиды владельцу; кнопки статуса и
                  «одобрить мастера» / «принять заявку».
                </li>
              </Ul>
            </section>

            <section>
              <H2 id="legal">Юридическое</H2>
              <Table
                headers={["Страница", "Содержание"]}
                rows={[
                  ["/legal", "Реквизиты самозанятого и список документов"],
                  ["/legal/privacy", "Политика конфиденциальности (152-ФЗ)"],
                  ["/legal/consent", "Текст согласия на обработку ПДн v1.0"],
                  ["/legal/terms", "Пользовательское соглашение"],
                  ["/legal/offer", "Публичная оферта (НПД, оплата, возвраты)"],
                ]}
              />
              <P>
                Оператор: самозанятый Кильметов Ильдар Ринатович. ИНН/email из{" "}
                <Code>OPERATOR_INN</Code> / <Code>OPERATOR_EMAIL</Code>.
              </P>
            </section>

            <section>
              <H2 id="architecture">Архитектура</H2>
              <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono ty-meta text-zinc-700">
                <div>
                  [Telegram Mini App / Browser] → AppShell (экраны)
                </div>
                <div className="pl-4">↓ fetch + Authorization</div>
                <div>
                  [Vercel / Next.js Route Handlers] → telegram-auth → db.ts
                </div>
                <div className="pl-4">↓</div>
                <div>[PostgreSQL RU/Neon] ← panels, users, requests, …</div>
                <div className="pl-4">↘</div>
                <div>
                  [Qwen VL] [DaData] [MOS] [YooKassa] [Telegram Bot API]
                </div>
              </div>
              <H3>Ключевые файлы</H3>
              <Table
                headers={["Тема", "Файл"]}
                rows={[
                  ["Shell / навигация", "src/components/app-shell.tsx"],
                  ["Типы", "src/types/index.ts"],
                  ["БД и схема", "src/lib/db.ts"],
                  ["Клиентские sync", "src/lib/user-data.ts, user-profile.ts"],
                  ["Инвайты", "src/lib/invites.ts"],
                  ["Услуги и цены", "src/lib/lead-services.ts"],
                  ["Платежи", "src/lib/yookassa.ts, sbp-fulfill.ts"],
                  ["Auth", "src/lib/telegram-auth.ts, session-token.ts"],
                  ["Админ", "src/lib/admin.ts, admin-db.ts"],
                  ["Env-шаблон", ".env.example"],
                ]}
              />
              <P>
                Документ отражает состояние кодовой базы на момент публикации
                страницы. При расхождении приоритет у кода в репозитории.
              </P>
            </section>
          </article>
        </main>
      </div>
    </div>
  );
}
