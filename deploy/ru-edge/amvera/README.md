# Amvera: вход в РФ без отдельного VPS

## Важно понять

| Что у вас сейчас | Что это |
|------------------|---------|
| PostgreSQL на Amvera | Только **база** (`RU_DATABASE_URL`) |
| Нужен «VPS» для сайта | Отдельное **приложение** (контейнер) в том же аккаунте |

Это **не** одна кнопка «сделать VPS из Postgres».  
Создаёте **второй проект** типа «Приложение» → туда кладёте nginx-прокси → привязываете `tokom.ru`.

Схема:

```
Пользователь в РФ
  → tokom.ru (IP Amvera, HTTPS делает Amvera)
  → ваш контейнер nginx
  → elektropasport.vercel.app (код по-прежнему на Vercel)
```

Готовые файлы лежат в этой папке: `Dockerfile`, `nginx.conf`, `amvera.yaml`.

---

## Пошагово

### 1. Новое приложение в Amvera

1. Войдите на [amvera.ru](https://amvera.ru) (тот же аккаунт, где Postgres).
2. **Создать проект** → тип **Приложение** (не «База данных»).
3. Имя, например: `tokom-edge`.
4. Окружение: **Docker**.
5. Создайте git-репозиторий Amvera для проекта (кнопка в мастере / «Репозиторий»).

Postgres **не трогайте** — он продолжает работать как раньше.

### 2. Залейте код прокси

Локально (из корня этого репозитория):

```bash
cd deploy/ru-edge/amvera

# добавьте remote Amvera (URL скопируйте из ЛК проекта tokom-edge)
git init
git add Dockerfile nginx.conf amvera.yaml
git commit -m "tokom RU edge proxy to Vercel"
git branch -M master
git remote add amvera <URL_РЕПОЗИТОРИЯ_ИЗ_AMVERA>
git push -u amvera master
```

Либо в веб-интерфейсе Amvera загрузите эти три файла в Code и запустите сборку.

Дождитесь статуса **«Запущено»**. В логах не должно быть ошибок nginx.

### 3. Проверка на бесплатном домене Amvera

1. Проект `tokom-edge` → **Настройки** → **Доменные имена** → **Добавить**.
2. Тип подключения: **HTTPS**.
3. Тип домена: **Бесплатный домен Amvera**.
4. Откройте выданный URL вида  
   `https://tokom-edge.<ваш-логин>.amvera.io`  
   с телефона **без VPN**.

Если открылся Током (главная / редирект логина) — прокси работает.

Если 502 — в логах приложения смотрите, достучался ли контейнер до `elektropasport.vercel.app`  
(`curl` снаружи не нужен: смотрите error_log nginx в логах Amvera).

### 4. Привязка tokom.ru и www

В Amvera для **каждого** имени (сначала `www.tokom.ru`, потом `tokom.ru` — или оба, если интерфейс позволяет):

1. **Добавить доменное имя** → HTTPS → **Свой домен**.
2. Amvera покажет:
   - **A** → IP (например `x.x.x.x`)
   - **TXT** → строка проверки
3. В кабинете регистратора DNS (REG.RU и т.п.):

| Хост | Тип | Значение |
|------|-----|----------|
| `@` | A | IP из Amvera |
| `www` | A | тот же IP |
| как сказал Amvera | TXT | строка проверки |

4. Удалите старые **CNAME** на `cname.vercel-dns.com` / A на Vercel.
5. В Amvera нажмите **Подтвердить и привязать**. Подождите выпуск SSL (обычно минуты, иногда дольше).

Проверка DNS: [dns-lookup.amvera](https://docs.amvera.ru/applications/configuration/network.html) / любой TXT+A lookup, пока Google 8.8.8.8 не увидит записи.

### 5. Vercel

В **Vercel → Domains** `tokom.ru` / `www.tokom.ru` можно оставить или убрать —
прокси ходит на `elektropasport.vercel.app` (Host совпадает с TLS SNI).  
Публичное имя (`tokom.ru`) передаётся в `X-Forwarded-Host`.

`CANONICALIZE_VERCEL_APP_HOST` **не** включайте.

### 6. Финальная проверка с телефона без VPN

- [ ] `https://tokom.ru`
- [ ] `https://www.tokom.ru`
- [ ] Вход через Telegram
- [ ] `https://www.tokom.ru/api/payments/robokassa-status`
- [ ] Запасной: `https://elektropasport.vercel.app` (всё ещё должен открываться)

---

## Тарифы

Postgres и приложение тарифицируются **отдельно**.  
Для nginx хватит самого дешёвого тарифа приложения (1 реплика).  
Следите за балансом в Amvera, чтобы edge не остановился вместе с БД.

## Если что-то не так

| Симптом | Что проверить |
|---------|----------------|
| 502 на amvera.io | Логи контейнера; доступ Amvera → Vercel |
| **403 Forbidden, ID `arn1::…`, заголовок `x-vercel-mitigated: deny`** | В `nginx.conf` должно быть `Host elektropasport.vercel.app`, не `www.tokom.ru`. Иначе Vercel режет domain-fronting. Залейте обновлённый конфиг и пересоберите приложение |
| **`upstream timed out` … `https://64.x.x.x:443/` (IP Vercel)** | Amvera в РФ **сама не достучится до CDN Vercel** — те же блокировки, что у пользователей. Прокси «Amvera → Vercel» в Москве не работает. Нужен либо VPS **вне** зоны блокировки (EU), либо запуск самого Next.js на Amvera/VPS в РФ без Vercel |
| Домен не привязывается | A + TXT как в подсказке Amvera; подождать DNS |
| Бесконечный редирект | Не включайте `CANONICALIZE_VERCEL_APP_HOST` |
| Открывается старый/чужой сайт | Кэш DNS; с телефона LTE вместо Wi‑Fi |
| Работает amvera.io, не tokom.ru | DNS ещё на Vercel — смените A-записи |

## Альтернатива

Если удобнее классический VPS — см. `../README.md` и `../nginx-tokom.conf` (Timeweb/Selectel).  
Для вашего случая Amvera-приложение обычно проще: SSL и IP в РФ уже из коробки.
