# Щитток

Telegram Mini App для оцифровки электрических щитков квартир и частных домов.

## Стек

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- `@tma.js/sdk` (Telegram Mini App)
- Neon Postgres (хранение щитков и заявок)

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

Без Telegram и без БД данные сохраняются в `localStorage` браузера (удобно для локальной проверки).

## Сохранение данных пользователя

Чтобы в Mini App щитки и заявки переживали повторный вход:

1. **BOT_TOKEN** — откройте [@BotFather](https://t.me/BotFather) → `/mybots` → ваш бот → **API Token**. Скопируйте токен вида `123456789:AAH...`.
2. **DATABASE_URL** — создайте бесплатную БД на [Neon](https://console.neon.tech), скопируйте connection string.
3. Добавьте обе переменные в Vercel → Project → Settings → Environment Variables (и в локальный `.env.local`).
4. Сделайте Redeploy.

Таблицы создаются автоматически при первом запросе.

## Вход в браузере (QR Telegram)

В Mini App вход автоматический через `initData`. В обычном браузере:

1. Кнопка **Войти по QR-коду** открывает `oauth.telegram.org` с QR.
2. Пользователь сканирует QR в приложении Telegram на телефоне (без `/start` в боте).
3. После подтверждения возвращается на `/auth/telegram/callback`.

В [@BotFather](https://t.me/BotFather) → ваш бот → **Login Widget / Web Login** добавьте:

- Allowed URL / domain: `https://elektropasport.vercel.app`
- Redirect URI: `https://elektropasport.vercel.app/auth/telegram/callback`

Рекомендуется также задать в Vercel:

- `TELEGRAM_CLIENT_ID` — Client ID из BotFather (обычно numeric id бота)
- `TELEGRAM_CLIENT_SECRET` — Client Secret из BotFather (современный OIDC-поток)

Без Client Secret используется legacy-редирект на ту же QR-страницу Telegram.

## Уведомления о заявках в Telegram

1. Узнайте свой numeric id в [@userinfobot](https://t.me/userinfobot).
2. В Vercel добавьте переменные:
   - `TELEGRAM_ADMIN_CHAT_ID` = ваш id
   - `TELEGRAM_SETUP_KEY` = любой секретный ключ (например `setup-abc123`)
   - `TELEGRAM_WEBHOOK_SECRET` = ещё один секрет (опционально, но желательно)
3. Redeploy.
4. Откройте в браузере (подставьте свой домен и ключ):

```
https://ВАШ-ДОМЕН.vercel.app/api/telegram/setup-webhook?key=setup-abc123
```

5. Напишите своему боту любое сообщение (чтобы чат был открыт) и создайте тестовую заявку в Mini App.

Новая заявка придёт сообщением с кнопками **Новая / В работе / Выполнено / Отменена**. Нажатие меняет статус в базе — клиент увидит его в Mini App.

## Текущий поток

1. Приветствие
2. Список щитков и заявок (загружается с сервера по Telegram user id)
3. Фото щитка → анализ → схема
4. Или заявка на установку щитка
