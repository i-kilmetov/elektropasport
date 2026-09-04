# Доступ tokom.ru из России

## Актуальная схема (2026)

**Прод = Amvera (Next.js)**, Vercel остаётся зеркалом с GitHub.

→ Инструкция: **[../../amvera/README.md](../../amvera/README.md)**  
→ Dockerfile: `amvera/Dockerfile`, конфиг: `amvera.yaml` в корне репозитория

Прокси «Amvera nginx → Vercel» из Москвы **не работает** (таймаут до CDN Vercel).

## Архив: nginx reverse-proxy

Папка `amvera/` здесь и `nginx-tokom.conf` — для VPS **вне** зоны блокировки Vercel (EU и т.п.), не для Amvera Москва.

## Запасной URL

`https://elektropasport.vercel.app` — пока Vercel деплоится с `main`.
