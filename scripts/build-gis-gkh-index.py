#!/usr/bin/env python3
"""Build slim nationwide MKD passport index from GIS ЖКХ CSV.

Writes data/gis-gkh/index/mkd.min.jsonl.gz — one JSON object per line:
  {"g":"<fias>","y":1970,"w":"Стены кирпичные","u":"ООО …"}

Fields y/w/u are omitted when empty.

Usage:
  python3 scripts/download-gis-gkh.py
  python3 scripts/build-gis-gkh-index.py
"""

from __future__ import annotations

import csv
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "data" / "gis-gkh" / "extracted" / "data_gisgkh_157_v20251205.csv"
OUT_DIR = ROOT / "data" / "gis-gkh" / "index"
OUT = OUT_DIR / "mkd.min.jsonl.gz"


def parse_year(raw: str | None) -> int | None:
    if not raw:
        return None
    m = re.search(r"(1[7-9]\d{2}|20\d{2})", raw.strip())
    if not m:
        return None
    year = int(m.group(0))
    return year if 1700 <= year <= 2100 else None


def clean(raw: str | None) -> str | None:
    if raw is None:
        return None
    value = raw.strip().strip('"').strip()
    return value or None


def main() -> None:
    if not CSV.exists():
        raise SystemExit(f"Missing {CSV}; run scripts/download-gis-gkh.py first")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    with_year = 0
    with_walls = 0
    with_uk = 0

    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as gz, CSV.open(
        "r", encoding="utf-8", errors="replace", newline=""
    ) as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            fias = clean(row.get("address_id"))
            if not fias:
                continue
            year = parse_year(row.get("building_year")) or parse_year(
                row.get("comissioning_year")
            )
            walls = clean(row.get("internal_walls_type"))
            uk = clean(row.get("management_organization_name"))
            rec: dict = {"g": fias.lower()}
            if year is not None:
                rec["y"] = year
                with_year += 1
            if walls:
                rec["w"] = walls
                with_walls += 1
            if uk:
                rec["u"] = uk
                with_uk += 1
            gz.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")
            written += 1
            if written % 100_000 == 0:
                print(f"  … {written:,}", flush=True)

    print(
        f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB) "
        f"rows={written:,} year={with_year:,} walls={with_walls:,} uk={with_uk:,}"
    )


if __name__ == "__main__":
    main()
