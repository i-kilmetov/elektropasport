# Выгрузка открытых данных Москвы (вариант 4: локальный кэш)

Скрипт качает с ноутбука в России два набора:

1. **Паспорта / база жилых домов** → адрес + год постройки/ввода  
2. **Капремонт** (если находится в каталоге) → адрес + годы плана/работ + краткий список работ  

Результат кладётся в `data/moscow/` в сжатом виде (`*.min.json.gz`).

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

export MOS_DATA_API_KEY='вставьте_ключ_сюда'

# опционально, если автопоиск ошибётся:
# export MOS_DOM_PASSPORT_DATASET_ID=60562
# export MOS_CAPITAL_REPAIR_DATASET_ID=XXXXX

node scripts/download-moscow-opendata.mjs
```

Ожидаемое время: **порядка 5–20 минут** (зависит от API и объёма капремонта).

В конце в консоли будет что-то вроде:

```text
Wrote data/moscow/houses.min.json.gz (N houses with year)
Wrote data/moscow/repairs.min.json.gz (M repair rows)
Wrote data/moscow/meta.json
```

---

## 3. Что должно появиться

| Файл | Назначение |
|------|------------|
| `data/moscow/meta.json` | id датасетов, дата выгрузки, счётчики |
| `data/moscow/houses.min.json.gz` | компактный кэш домов (адрес + год) |
| `data/moscow/repairs.min.json.gz` | компактный кэш капремонта |
| `data/moscow/houses.sample.json` | 3 сырых строки (чтобы увидеть имена полей) |
| `data/moscow/repairs.sample.json` | 3 сырых строки капремонта |

Размер обычно **порядка 1–5 МБ** на оба gzip (не полный «толстый» паспорт).

---

## 4. Если датасет капремонта не нашёлся

1. На [data.mos.ru](https://data.mos.ru) найдите набор вроде «региональная программа капитального ремонта» / «краткосрочный план… МКД».  
2. Откройте карточку набора — в URL или метаданных будет **числовой id**.  
3. Запустите снова:

```bash
export MOS_CAPITAL_REPAIR_DATASET_ID=12345   # ваш id
node scripts/download-moscow-opendata.mjs
```

Откройте `repairs.sample.json` и проверьте, что есть адрес и годы. Если поля называются иначе — пришлите sample, подправим компактор.

---

## 5. Проверка глазами

Распаковать и глянуть несколько записей:

```bash
# macOS / Linux
gunzip -c data/moscow/houses.min.json.gz | head -c 2000
echo
gunzip -c data/moscow/repairs.min.json.gz | head -c 2000
```

Или поиск по адресу:

```bash
gunzip -c data/moscow/houses.min.json.gz | python3 -c "
import sys,json,re
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
3. Раз в 1–3 месяца можно просто снова запустить тот же скрипт и обновить файлы.

Сырые полные дампы (если сохраните сами) в git лучше не класть — только компактные `*.min.json.gz`.

---

## Частые проблемы

| Симптом | Что делать |
|---------|------------|
| `fetch failed` / timeout | Нужен интернет в РФ; отключите зарубежный VPN |
| `HTTP 401/403` | Неверный или отозванный `MOS_DATA_API_KEY` |
| Houses 0 / мало записей | Задайте `MOS_DOM_PASSPORT_DATASET_ID=60562` (или id с портала) |
| Repairs не скачался | Задайте `MOS_CAPITAL_REPAIR_DATASET_ID` вручную |
| Очень долго | Нормально при большом датасете; не прерывайте на середине |

Ключ API **не коммитьте** в репозиторий и не вставляйте в чат публично.
