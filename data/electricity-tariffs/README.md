# Electricity tariffs (population)

Residential (физлица) electricity tariffs by Russian region for Tokom.

## Source

Aggregated from [elec.ru — тарифы 2026](https://www.elec.ru/library/rd/tarify-elektroenergiya-2026/)  
(regional regulator tables: одноставочный / двухзонный / трёхзонный, город / с электроплитой / село).

Each region entry stores **effective date periods** (`from` / `to`) so the app picks the rate that is valid “today”.

Official acts are set by regional energy commissions; elec.ru republishes them. Re-scrape when tariffs are reindexed (usually 1 July / 1 Oct).

## Build

1. Download HTML pages into `data/electricity-tariffs/raw/` (browser or curl after captcha).
2. Parse:

```bash
python3 scripts/build-electricity-tariffs.py
```

Writes `data/electricity-tariffs/index/regions.min.json` (**commit this**).

## Runtime

`buildHouseTariffSnapshot({ region, city })` in `src/lib/electricity-tariffs.ts`  
→ attached to house insight / panel snapshot. User picks meter type (1/2/3 or custom) in the house insight sheet.
