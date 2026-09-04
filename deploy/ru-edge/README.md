# Доступ tokom.ru из России без ухода с Vercel

## В чём проблема

Провайдеры в РФ часто режут IP/CDN **Vercel** (и Cloudflare). Браузер пользователя
не доходит до origin, поэтому `tokom.ru` «не открывается», хотя деплой живой.
Обход: **маленький VPS в РФ** принимает HTTPS на `tokom.ru` и проксирует на
`elektropasport.vercel.app`. Код и деплой остаются на Vercel.

Cloudflare «оранжевое облако» обычно **не** спасает (CF тоже режут). Нужен свой IP в РФ.

## Что уже сделано в коде

- Редирект `elektropasport.vercel.app` → `tokom.ru` **выключен по умолчанию**
  (чтобы не было петли через прокси и был запасной URL).
- Чтобы снова включить редирект: `CANONICALIZE_VERCEL_APP_HOST=1` в Vercel.

## Срочный план (30–60 минут)

### 1. VPS в России

Любой: Timeweb, Selectel, REG.RU, Aeza… Ubuntu 22.04+, 1 vCPU, 1 GB RAM хватит.
Откройте порты **80** и **443**.

Запомните публичный IPv4: `A.B.C.D`.

### 2. DNS (регистратор домена tokom.ru)

Пока **не** переключайте боевой трафик — сначала поднимите nginx и сертификат.

Нужные записи (TTL 300):

| Имя | Тип | Значение |
|-----|-----|----------|
| `@` (tokom.ru) | **A** | `A.B.C.D` |
| `www` | **A** | `A.B.C.D` |
| `test` (если нужен) | **A** | `A.B.C.D` |

Удалите/замените старые CNAME на `cname.vercel-dns.com` / A на Vercel.

В **Vercel → Project → Domains** домены `tokom.ru` / `www.tokom.ru` **оставьте
подключёнными** к проекту (нужно, чтобы Host `www.tokom.ru` принимался).
Проверка DNS в Vercel может показывать ошибку — это нормально, пока A смотрит на VPS.

### 3. Nginx + сертификат на VPS

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot

# скопируйте конфиг из репозитория:
# deploy/ru-edge/nginx-tokom.conf  →  /etc/nginx/sites-available/tokom
sudo ln -sf /etc/nginx/sites-available/tokom /etc/nginx/sites-enabled/tokom
sudo rm -f /etc/nginx/sites-enabled/default

# временно только HTTP-сервер (listen 80) — закомментируйте блоки 443,
# либо получите сертификат так:
sudo certbot certonly --webroot -w /var/www/certbot \
  -d tokom.ru -d www.tokom.ru -d test.tokom.ru

sudo nginx -t && sudo systemctl reload nginx
```

После появления сертификатов раскомментируйте/включите полный конфиг из
`nginx-tokom.conf` и снова `nginx -t && systemctl reload nginx`.

### 4. Проверка

С телефона **без VPN**, сеть МТС/Мегафон/дом.провайдер:

1. `https://tokom.ru` — открывается
2. Логин Telegram / школа / фото щитка
3. `https://www.tokom.ru/api/payments/robokassa-status` — JSON
4. Webhook Telegram и Result URL Robokassa не меняйте — они бьют в тот же домен

Запасной URL (если DNS ещё не сменился): `https://elektropasport.vercel.app`
(после деплоя middleware больше не кидает на tokom.ru).

### 5. Что не делать

- Не включать Cloudflare proxy (оранжевое облако) перед этим edge
- Не переносить Next.js с Vercel «на всякий случай» — сначала хватит прокси
- Не ставить `CANONICALIZE_VERCEL_APP_HOST=1`, пока edge в РФ не стабилен

## Если VPS не видит Vercel

С VPS: `curl -I https://elektropasport.vercel.app`  
Должен быть `200`/`308`. Если таймаут — смените датацентр VPS или
провайдера (редко режут и исходящий трафик из РФ на Vercel).

## Поддержка

После смены DNS подождите 5–30 минут (TTL). Если сайт открывается с VPS
(`curl -H 'Host: www.tokom.ru' https://127.0.0.1/ -k`), но не с телефона —
проверьте, что у `@` и `www` именно A на VPS, без старых CNAME.
