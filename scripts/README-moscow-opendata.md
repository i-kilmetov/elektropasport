# Выгрузка открытых данных Москвы (вариант 4: локальный кэш)

Скрипт качает с ноутбука в России два набора:

1. **Паспорта / база жилых домов** → адрес + **год постройки/ввода**  
2. **Капремонт** (если находится в каталоге) → адрес + годы плана/работ + краткий список работ  

Результат кладётся в `data/moscow/` в сжатом виде (`*.min.json.gz`).

---

## Важно: не берите 60562

`MOS_DOM_PASSPORT_DATASET_ID=60562` — это **«Адресный реестр объектов недвижимости»** (~550k строк, ~800 МБ). Там есть адреса, **нет года постройки**. Часы загрузки уходят впустую.

Сначала найдите набор **с адресом и годом**:

```bash
export MOS_DATA_API_KEY='вставьте_ключ_сюда'
node scripts/find-moscow-year-dataset.mjs
```

В конце скрипт выведет кандидатов с колонками года. Возьмите подходящий id.

Если уже скачали 60562 — удалите сырой дамп (освободит ~800 МБ):

```bash
rm -f data/moscow/houses.raw.jsonl data/moscow/houses.checkpoint.json
```

---

## 0. Что нужно

- Ноутбук / ПК **в России** (или VPN с выходом в РФ) — `apidata.mos.ru` часто режет зарубежные IP  
- Node.js 18+ (`node -v`)  
- Ключ API портала открытых данных Москвы  

---

## 1. Получить ключ API

1. Откройте [data.mos.ru](https://data.mos.ru) → регистрация / вход.  
2. Раздел для разработчиков: [data.mos.ru/developers](https://data.mos.ru/developers) (личный кабинет).  
3. Создайте / скопируйте **API key**.  
4. Проверка в браузере (подставьте ключ):

```text
https://apidata.mos.ru/v1/datasets?$top=1&api_key=ВАШ_КЛЮЧ
```

Должен вернуться JSON, не ошибка сети / 403.

---

## 2. Скачать репозиторий и запустить скрипт

В корне проекта:

```bash
cd elektropasport
git pull

export MOS_DATA_API_KEY='вставьте_ключ_сюда'

# 1) найти датасет с годом постройки
node scripts/find-moscow-year-dataset.mjs

# 2) подставить id из вывода (НЕ 60562)
export MOS_DOM_PASSPORT_DATASET_ID=ЧИСЛО_С_ГОДОМ

# капремонт (часто подходит 62963 — работы по капремонту МКД)
export MOS_CAPITAL_REPAIR_DATASET_ID=62963

npm run moscow:download
```

Или без ручного id: `npm run moscow:download` сам ищет набор с колонками адреса+года (но find-скрипт надёжнее).

Ожидаемое время: **десятки минут… несколько часов** в зависимости от размера набора и API. Скрипт умеет **продолжать** с checkpoint (`*.checkpoint.json`), если оборвался.

В конце в консоли будет что-то вроде:

```text
Wrote data/moscow/houses.min.json.gz (N houses with year)
Wrote data/moscow/repairs.min.json.gz (M repair rows)
Wrote data/moscow/meta.json
```

`N` должно быть **> 0**. Если 0 — выбран неверный датасет.

---

## 3. Что должно появиться

| Файл | Назначение |
|------|------------|
| `data/moscow/meta.json` | id датасетов, дата выгрузки, счётчики |
| `data/moscow/houses.min.json.gz` | компактный кэш домов (адрес + год) |
| `data/moscow/repairs.min.json.gz` | компактный кэш капремонта |
| `data/moscow/houses.sample.json` | 3 сырых строки (чтобы увидеть имена полей) |
| `data/moscow/repairs.sample.json` | 3 сырых строки капремонта |

Размер компакта обычно **порядка 1–10 МБ** на gzip. Сырые `*.raw.jsonl` в git не нужны — после успеха можно удалить.

---

## 4. Если датасет капремонта не нашёлся

1. На [data.mos.ru](https://data.mos.ru) найдите набор вроде «работы по капитальному ремонту МКД» / «региональная программа…».  
2. Откройте карточку набора — в URL или метаданных будет **числовой id**.  
3. Запустите снова:

```bash
export MOS_CAPITAL_REPAIR_DATASET_ID=62963   # или ваш id
npm run moscow:download
```

Откройте `repairs.sample.json` и проверьте, что есть адрес и годы. Если поля называются иначе — пришлите sample, подправим компактор.

---

## 5. Проверка глазами

```bash
gunzip -c data/moscow/houses.min.json.gz | head -c 2000
echo
gunzip -c data/moscow/repairs.min.json.gz | head -c 2000
```

Поиск по адресу:

```bash
gunzip -c data/moscow/houses.min.json.gz | python3 -c "
import sys,json
d=json.load(sys.stdin)
q='саларьев'
for h in d['houses']:
  if q in h['a'].lower():
    print(h)
"
```

---

## 6. Что сделать после выгрузки

1. Закоммитьте / пришлите папку `data/moscow/` (как минимум `*.min.json.gz` + `meta.json`).  
2. В коде подключим чтение кэша вместо live `apidata.mos.ru` для Москвы.  
3. Раз в 1–3 месяца можно снова запустить тот же скрипт и обновить файлы.

Сырые `*.raw.jsonl` в git не кладите.

---

## Частые проблемы

| Симптом | Что делать |
|---------|------------|
| `fetch failed` / timeout | Интернет в РФ; отключите зарубежный VPN; скрипт сам ретраит |
| `HTTP 401/403` | Неверный или отозванный `MOS_DATA_API_KEY` |
| `Invalid string length` | Старый баг (файл целиком в память). Обновите скрипт (`git pull`) — компакт идёт потоком |
| Датасет 60562 / 0 домов с годом | Это адресный реестр. Найдите id через `find-moscow-year-dataset.mjs` |
| Repairs не скачался | `export MOS_CAPITAL_REPAIR_DATASET_ID=62963` |
| Очень долго | Нормально на больших наборах; не прерывайте — есть resume |

Ключ API **не коммитьте** в репозиторий и не вставляйте в чат публично.
