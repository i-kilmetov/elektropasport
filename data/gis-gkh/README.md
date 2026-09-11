# GIS ЖКХ — nationwide MKD passports

Source: [Износ и аварийность многоквартирных домов](https://tochno.st/datasets/gisgkh)  
(ГИС ЖКХ / Минстрой; обработка «Если быть точным», ноябрь 2025)  
License: Creative Commons BY 4.0

## What we use

| Field | Source column | Coverage (dump) |
|-------|---------------|-----------------|
| FIAS id | `address_id` | 100% (~950 702) |
| Year | `building_year` → `comissioning_year` | ~98% |
| Walls | `internal_walls_type` (e.g. «Стены кирпичные») | ~79% |
| UK | `management_organization_name` | ~70% |

This is the **passport** layer for Tokom (year / walls / UK).  
Capital-repair of electrical networks still comes from **ФРТ / Reform GKH** indexes under `data/reform-gkh/`.

Join key: DaData **`house_fias_id`** (house level, not flat) → GIS `address_id`.

## Build

```bash
python3 scripts/download-gis-gkh.py
python3 scripts/build-gis-gkh-index.py
```

Writes:
- `data/gis-gkh/index/mkd.min.sqlite` (~101 MB, gitignored)
- `data/gis-gkh/index/mkd.min.sqlite.gz` (~37 MB, **commit this**)

Runtime opens SQLite via `node:sqlite` (Amvera sets `NODE_OPTIONS=--experimental-sqlite`).

## Lookup

Server: `lookupGisGkhHouse({ fiasId })` — O(1) by FIAS, no full-index load into RAM.
