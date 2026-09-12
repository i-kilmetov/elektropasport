# Reform GKH / ФРТ open data

Source: [АИС ППК «ФРТ» → Открытые данные](https://аис.фрт.рф/opendata)
(`https://xn--80adsazqn.xn--p1aee.xn--p1ai/opendata`)

## Download (all regions)

```bash
python3 scripts/download-reform-gkh.py --all
# or a subset
python3 scripts/download-reform-gkh.py --regions smolenskaya_oblast moscow
python3 scripts/download-reform-gkh.py --list-regions
```

Default datasets: **kr1_1** + **kr1_3** (skip bulky kr1_2). Zips land in `data/reform-gkh/raw/` (gitignored). Resume-safe: existing valid zips are skipped.

```bash
python3 scripts/unzip-reform-gkh.py
python3 scripts/build-reform-gkh-index.py
```

Writes `data/reform-gkh/index/electrical.min.sqlite.gz` (**commit this**). Uncompressed `.sqlite` is gitignored and extracted at runtime / in the Amvera image.

## What each report is

| ID | Meaning |
|----|---------|
| **kr1_1** | МКД in regional capital-repair program: address, **`houseguid` (ФИАС)**, year, floors, flats |
| **kr1_2** | Constructive elements & engineering systems (optional; large) |
| **kr1_3** | Overhaul services/works: type, planned/fact year (electrical = code `2` / «электр…») |

## Role in Tokom

**ФРТ index is only for electrical overhaul** (last / next year of in-building electrical network repair), keyed by house FIAS.

Passport fields (year, walls, UK) come from the nationwide GIS ЖКХ index — see `data/gis-gkh/README.md`.

Lookup: `lookupReformGkhHouse` in `/api/house-lookup` joins `houseguid` ↔ DaData `house_fias_id`.
