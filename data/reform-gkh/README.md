# Reform GKH / ФРТ open data (test dumps)

Source: [АИС ППК «ФРТ» → Открытые данные](https://аис.фрт.рф/opendata)
(`https://xn--80adsazqn.xn--p1aee.xn--p1ai/opendata`)

## Download (Moscow + Bashkortostan)

```bash
python3 scripts/download-reform-gkh.py
# or
python3 scripts/download-reform-gkh.py --regions moscow bashkortostan
```

Zips land in `data/reform-gkh/raw/`. Unzip manually to `extracted/` (gitignored — hundreds of MB CSV).

### Sizes (snapshot 2026-09-01)

| Region | File | Zip | Unpacked CSV |
|--------|------|-----|--------------|
| Москва (77) | kr1_1 | ~2.2 MB | ~11 MB · 30 292 МКД |
| Москва | kr1_2 | ~3.9 MB | ~120 MB · 611 249 строк |
| Москва | kr1_3 | ~8.0 MB | ~157 MB · 537 884 строк |
| Башкортостан (02) | kr1_1 | ~1.3 MB | ~7 MB · 18 145 МКД |
| Башкортостан | kr1_2 | ~0.9 MB | ~31 MB |
| Башкортостан | kr1_3 | ~1.9 MB | ~36 MB |

CSV: `;`-separated, usually UTF-8 BOM (иногда cp1251 на отдельных файлах).

## What each report is

| ID | Meaning |
|----|---------|
| **kr1_1** | МКД in regional capital-repair program: address, **`houseguid` (ФИАС)**, year, floors, flats, fund balances |
| **kr1_2** | Constructive elements & **engineering systems** per house (roof, facade, lifts, HVAC, **электроснабжение**, …) |
| **kr1_3** | Overhaul **services/works**: type, planned/fact year, contractor, cost fields |

Presence in kr1_1 ⇒ almost certainly MKD. No row ⇒ not proof of private house (registry gaps / new builds).

## Matching DaData

`kr1_1.houseguid` is filled for **100%** of Moscow and Bashkortostan rows in this dump → join to DaData `house_fias_id` / `fias_id` at house level. Prefer GUID over string address.

## Capital repair & electricity (answer for product)

**Yes — electricity is explicit**, but as *common-property in-building networks*, not apartment panels.

### kr1_2 — systems present on the house
Example Moscow counts (among others):
- `инженерная система электроснабжения` — ~29 800 rows (code `2`)
- heat / cold water / sewage / gas / lifts / facade / roof / …

This says the system exists in the passport, not that it was recently replaced.

### kr1_3 — planned or done overhaul of that system
Service types include:
- **`ремонт внутридомовых инженерных сетей электроснабжения`** (~31 150 in Moscow dump)
- plus heat/water/sewage/gas/lifts/roof/facade/…

Useful fields:
- `service_type`
- `construction_element_code` (`2` = electricity)
- `service_date` / `service_date_by_plan` (often a **year**)
- `fact_date_services_finished`, contractor, costs

Moscow electricity works in this dump: ~31 6xx rows; mix of past years (2015–2026) and future program years (often 2029–2044).

**What you can infer for Tokom safety:**
- MKD + year from kr1_1
- Whether in-building electrical network is on the overhaul program / already repaired (year)
- **Not**: whether the flat panel has SPD/AFDD, breaker kA, PE in the apartment — that stays on photo/scheme analysis

## Next steps

1. Keep zips locally (or CI cache); don’t commit unpacked CSV.
2. Build slim indexes for the app:

```bash
python3 scripts/build-reform-gkh-index.py
```

Writes `data/reform-gkh/index/{moscow,bashkortostan}.min.json.gz` (committed).

3. Server lookup: `lookupReformGkhHouse` in `/api/house-lookup` joins by
   `houseguid` ↔ DaData `house_fias_id` (fallback: normalized address).
4. Product rule: house before 1995 + electrical overhaul done ⇒ grounding likely present;
   otherwise show planned year when available.
5. If tests look good, run `python3 scripts/download-reform-gkh.py --list-regions` and extend `--regions`.
