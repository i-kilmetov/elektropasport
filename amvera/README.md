# Прод на Amvera + зеркало на Vercel

## Зачем так

- **Пользователи** заходят на `tokom.ru` → **Amvera** (РФ, без CDN Vercel).
- **Vercel** продолжает деплоиться с GitHub — запасной контур, если решите вернуть DNS на Vercel.
- База — **Amvera Postgres** (`RU_DATABASE_URL`) для обоих (когда включите Vercel обратно — тот же URL).

Прокси Amvera→Vercel в Москве **не используем** (таймаут до IP Vercel).

## Два деплоя из одного репозитория

| Куда | Как обновляется |
|------|-----------------|
| **Vercel** | Как сейчас: push в `main` на GitHub → автодеплой. Ничего не отключайте. |
| **Amvera** (`tokom-edge`) | Тот же GitHub-репозиторий (или `git push` в remote Amvera) → пересборка. |

После push в `main` Vercel обновится сам. Amvera — если проект привязан к GitHub/`main`, тоже; иначе: **Пересобрать** или push в remote Amvera.

## Один раз: перевести `tokom-edge` с nginx на Next.js

Сейчас в Amvera лежат только `Dockerfile` + `nginx.conf`. Нужен **весь** репозиторий `elektropasport`.

### Вариант A — GitHub (удобнее)

1. В Amvera у проекта: привяжите GitHub-репозиторий `elektropasport`, ветка `main`.
2. В корне уже есть `amvera.yaml` и `amvera/Dockerfile`.
3. Удалите из корня Amvera-проекта старые одиночные `nginx.conf` / старый root-`Dockerfile`, если они перекрывают файлы из git (при полном clone с GitHub их не будет).

### Вариант B — remote Amvera

```bash
cd /path/to/elektropasport
git remote add amvera <URL_РЕПО_ИЗ_ТОКОМ-EDGE>
git push amvera main:master
```

(ветку уточните в ЛК Amvera — часто `master`).

## Переменные окружения

Amvera → **Переменные**: скопируйте **Production** с Vercel (те же имена).

Обязательно для сборки (подставляются в клиентский бандл):

- `NEXT_PUBLIC_APP_URL=https://tokom.ru`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=…`
- остальные `NEXT_PUBLIC_*`, которые есть на Vercel

Обязательно для рантайма (секреты):

- `RU_DATABASE_URL` (Postgres Amvera)
- `BOT_TOKEN`, `TELEGRAM_*`, `AUTH_SECRET` / OAuth
- `DASHSCOPE_API_KEY` / Qwen
- `ROBOKASSA_*`
- `DADATA_API_KEY`, `MOS_DATA_API_KEY`, …
- полный список — `.env.example`

Не копируйте системные `VERCEL_*`.  
`CANONICALIZE_VERCEL_APP_HOST` **не** включайте.

После смены переменных — **Пересобрать** (из‑за `NEXT_PUBLIC_*`).

## DNS

Оставьте A для `@` и `www` на IP Amvera (как сейчас).  
В Vercel домены `tokom.ru` / `www` можно оставить (будет «DNS incorrect» — нормально).

## Проверка

1. Amvera статус **Запущено**, в логах нет `upstream timed out`.
2. С телефона **без VPN**: `https://tokom.ru`
3. Вход Telegram, щиток, оплата (Robokassa Result URL на `www.tokom.ru` должен попадать на Amvera).
4. Запасной URL для себя с VPN: `https://elektropasport.vercel.app` (должен оставаться актуальным после push в `main`).

## Откат только на Vercel

1. DNS снова на Vercel (A/CNAME как раньше).
2. Amvera → заморозить/остановить приложение.
3. Код и Variables на Vercel уже актуальны.

## Старый nginx-прокси

Файлы в `deploy/ru-edge/amvera/` — архив / VPS вне РФ. Для Москвы→Vercel не использовать.
