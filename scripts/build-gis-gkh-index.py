#!/usr/bin/env python3
"""Build slim nationwide MKD passport SQLite from GIS ЖКХ CSV.

Writes:
  data/gis-gkh/index/mkd.min.sqlite
  data/gis-gkh/index/mkd.min.sqlite.gz  (commit this; ~37 MB)

Schema: houses(fias PK, year, walls, uk) WITHOUT ROWID

Usage:
  python3 scripts/download-gis-gkh.py
  python3 scripts/build-gis-gkh-index.py
"""

from __future__ import annotations

import csv
import gzip
import re
import shutil
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "data" / "gis-gkh" / "extracted" / "data_gisgkh_157_v20251205.csv"
OUT_DIR = ROOT / "data" / "gis-gkh" / "index"
OUT = OUT_DIR / "mkd.min.sqlite"
OUT_GZ = OUT_DIR / "mkd.min.sqlite.gz"


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
    if OUT.exists():
        OUT.unlink()

    conn = sqlite3.connect(OUT)
    conn.execute("PRAGMA journal_mode=OFF")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute(
        """
        CREATE TABLE houses (
          fias TEXT NOT NULL PRIMARY KEY,
          year INTEGER,
          walls TEXT,
          uk TEXT
        ) WITHOUT ROWID
        """
    )

    written = 0
    with_year = 0
    with_walls = 0
    with_uk = 0
    batch: list[tuple] = []

    with CSV.open("r", encoding="utf-8", errors="replace", newline="") as f:
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
            if year is not None:
                with_year += 1
            if walls:
                with_walls += 1
            if uk:
                with_uk += 1
            batch.append((fias.lower(), year, walls, uk))
            if len(batch) >= 20_000:
                conn.executemany("INSERT OR REPLACE INTO houses VALUES (?,?,?,?)", batch)
                written += len(batch)
                batch.clear()
                print(f"  … {written:,}", flush=True)
        if batch:
            conn.executemany("INSERT OR REPLACE INTO houses VALUES (?,?,?,?)", batch)
            written += len(batch)

    conn.commit()
    conn.execute("VACUUM")
    conn.close()

    with OUT.open("rb") as src, gzip.open(OUT_GZ, "wb", compresslevel=9) as dst:
        shutil.copyfileobj(src, dst)

    print(
        f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB) "
        f"and {OUT_GZ} ({OUT_GZ.stat().st_size / 1e6:.1f} MB) "
        f"rows={written:,} year={with_year:,} walls={with_walls:,} uk={with_uk:,}"
    )


if __name__ == "__main__":
    main()
