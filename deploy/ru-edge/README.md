# Доступ tokom.ru из России без ухода с Vercel

## В чём проблема

Провайдеры в РФ часто режут IP/CDN **Vercel**. Браузер не доходит до origin.
Обход: вход в РФ (Amvera-приложение или VPS) → reverse-proxy → Vercel.
Код остаётся на Vercel.

## Рекомендуемый путь (у вас уже есть Amvera + Postgres)

**Не VPS из базы**, а отдельное **приложение**-прокси в том же аккаунте.

→ Подробная инструкция: **[amvera/README.md](./amvera/README.md)**  
→ Файлы деплоя: `amvera/Dockerfile`, `amvera/nginx.conf`, `amvera/amvera.yaml`

Кратко:
1. Создать проект «Приложение» `tokom-edge` (Docker).
2. Запушить содержимое `deploy/ru-edge/amvera/`.
3. Привязать HTTPS-домен Amvera, проверить с телефона.
4. Прописать A+TXT для `tokom.ru` / `www` на IP Amvera.
5. Postgres не трогать.

## Альтернатива: свой VPS

См. конфиг `nginx-tokom.conf` ниже по файлу / в корне `deploy/ru-edge/`.
VPS в РФ + certbot + A-записи на IP VPS.

## Что уже сделано в коде

- Редирект `elektropasport.vercel.app` → `tokom.ru` **выключен по умолчанию**.
- Включить снова: `CANONICALIZE_VERCEL_APP_HOST=1` в Vercel (не нужно, пока edge в РФ).

## Запасной URL

Пока DNS не сменился: `https://elektropasport.vercel.app`
