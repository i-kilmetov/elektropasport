#!/usr/bin/env python3
"""Build nationwide Reform GKH electrical-overhaul SQLite from extracted CSVs.

Reads all data/reform-gkh/extracted/export-kr1_{1,3}-*-*.csv and writes:
  data/reform-gkh/index/electrical.min.sqlite
  data/reform-gkh/index/electrical.min.sqlite.gz

Schema (WITHOUT ROWID):
  fias TEXT PK, year INT, floors INT, flats INT,
  el INT (last electrical overhaul), en INT (next planned),
  region TEXT

Usage:
  python3 scripts/download-reform-gkh.py --all
  python3 scripts/unzip-reform-gkh.py
  python3 scripts/build-reform-gkh-index.py
"""

from __future__ import annotations

import csv
import gzip
import re
import shutil
import sqlite3
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = ROOT / "data" / "reform-gkh" / "extracted"
OUT_DIR = ROOT / "data" / "reform-gkh" / "index"
OUT = OUT_DIR / "electrical.min.sqlite"
OUT_GZ = OUT_DIR / "electrical.min.sqlite.gz"

CURRENT_YEAR = 2026


def detect_encoding(path: Path) -> str:
    raw = path.read_bytes()
    sample = raw[:200_000]
    # UTF-8 BOM is authoritative — never prefer cp1251 for BOM files
    # (mis-decoding UTF-8 as cp1251 inflates "cyrillic" counts).
    if sample.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    candidates: list[tuple[str, int]] = []
    for enc in ("utf-8", "cp1251"):
        try:
            text = sample.decode(enc)
        except Exception:
            continue
        # Reject encodings that produce replacement/mojibake markers in header
        if "\ufffd" in text[:500]:
            continue
        cyr = sum(1 for ch in text if "А" <= ch <= "я" or ch in "ёЁ")
        # Prefer clean UTF-8 when it decodes and has a normal header key
        bonus = 50_000 if enc == "utf-8" and "subject_rf" in text[:300] else 0
        candidates.append((enc, cyr + bonus))
    if not candidates:
        return "utf-8-sig"
    candidates.sort(key=lambda item: item[1], reverse=True)
    return candidates[0][0]


def open_csv(path: Path):
    encoding = detect_encoding(path)
    f = path.open("r", encoding=encoding, errors="replace", newline="")
    sample = f.read(4096)
    f.seek(0)
    delim = (
        ";"
        if sample.splitlines()[0].count(";") >= sample.splitlines()[0].count(",")
        else ","
    )
    return f, csv.DictReader(f, delimiter=delim), encoding


def parse_year(raw: str | None) -> int | None:
    if not raw:
        return None
    m = re.search(r"(19|20)\d{2}", raw)
    if not m:
        return None
    year = int(m.group(0))
    return year if 1800 <= year <= 2100 else None


def is_electrical_service(row: dict) -> bool:
    code = (row.get("construction_element_code") or "").strip()
    if code == "2":
        return True
    text = " ".join(
        [
            row.get("service_type") or "",
            row.get("service_code") or "",
            row.get("work_code") or "",
        ]
    ).lower()
    return "электр" in text


def region_label_from_rows(path: Path) -> str:
    f, reader, _ = open_csv(path)
    try:
        for row in reader:
            label = (row.get("subject_rf") or "").strip()
            if label:
                return label
    finally:
        f.close()
    return path.stem


def build_pair(kr1: Path, kr3: Path) -> list[tuple]:
    label = region_label_from_rows(kr1)
    houses: dict[str, dict] = {}
    f, reader, enc1 = open_csv(kr1)
    print(f"  {kr1.name} encoding={enc1} region={label}")
    for row in reader:
        guid = (row.get("houseguid") or "").strip().lower()
        if not guid:
            continue
        floors_m = re.search(r"\d+", row.get("number_floors_max") or "")
        flats_m = re.search(
            r"\d+",
            row.get("living_rooms_amount") or row.get("total_rooms_amount") or "",
        )
        houses[guid] = {
            "y": parse_year(row.get("commission_year")),
            "fl": int(floors_m.group(0)) if floors_m else None,
            "fa": int(flats_m.group(0)) if flats_m else None,
            "el": None,
            "en": None,
            "mk": (row.get("mkd_code") or "").strip() or None,
            "a": (row.get("address") or "").strip(),
            "region": label,
        }
    f.close()

    by_mkd: dict[str, str] = {}
    by_addr: dict[str, str] = {}
    for guid, h in houses.items():
        if h.get("mk"):
            by_mkd[h["mk"]] = guid
        if h.get("a"):
            by_addr[h["a"].lower()] = guid

    last_by_guid: dict[str, list[int]] = defaultdict(list)
    next_by_guid: dict[str, list[int]] = defaultdict(list)

    f, reader, enc3 = open_csv(kr3)
    print(f"  {kr3.name} encoding={enc3}")
    matched = 0
    for row in reader:
        if not is_electrical_service(row):
            continue
        mk = (row.get("mkd_code") or "").strip()
        addr = (row.get("address") or "").strip().lower()
        guid = by_mkd.get(mk) or by_addr.get(addr)
        if not guid:
            continue
        matched += 1
        year = (
            parse_year(row.get("service_date"))
            or parse_year(row.get("service_date_by_plan"))
            or parse_year(row.get("fact_date_services_finished"))
        )
        if year is None:
            continue
        if year <= CURRENT_YEAR:
            last_by_guid[guid].append(year)
        else:
            next_by_guid[guid].append(year)
    f.close()

    for guid, years in last_by_guid.items():
        if guid in houses:
            houses[guid]["el"] = max(years)
    for guid, years in next_by_guid.items():
        if guid in houses:
            houses[guid]["en"] = min(years)

    rows = []
    for guid, h in houses.items():
        rows.append(
            (
                guid,
                h["y"],
                h["fl"],
                h["fa"],
                h["el"],
                h["en"],
                h["region"],
            )
        )
    print(
        f"  → houses={len(rows)} electrical_matched={matched} "
        f"with_last={sum(1 for r in rows if r[4])} with_next={sum(1 for r in rows if r[5])}"
    )
    return rows


def main() -> None:
    pairs: list[tuple[Path, Path]] = []
    for kr1 in sorted(EXTRACTED.glob("export-kr1_1-*-*.csv")):
        # export-kr1_1-77-20260901.csv → export-kr1_3-77-20260901.csv
        name = kr1.name.replace("export-kr1_1-", "export-kr1_3-", 1)
        kr3 = EXTRACTED / name
        if not kr3.exists():
            print(f"skip {kr1.name}: missing {name}")
            continue
        pairs.append((kr1, kr3))

    if not pairs:
        raise SystemExit(f"No kr1_1/kr1_3 pairs in {EXTRACTED}")

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
          floors INTEGER,
          flats INTEGER,
          el INTEGER,
          en INTEGER,
          region TEXT
        ) WITHOUT ROWID
        """
    )

    total = 0
    for kr1, kr3 in pairs:
        rows = build_pair(kr1, kr3)
        conn.executemany(
            "INSERT OR REPLACE INTO houses VALUES (?,?,?,?,?,?,?)",
            rows,
        )
        total += len(rows)
        print(f"  … total {total:,}", flush=True)

    conn.commit()
    conn.execute("VACUUM")
    conn.close()

    with OUT.open("rb") as src, gzip.open(OUT_GZ, "wb", compresslevel=9) as dst:
        shutil.copyfileobj(src, dst)

    print(
        f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB) and "
        f"{OUT_GZ} ({OUT_GZ.stat().st_size / 1e6:.1f} MB) rows={total:,}"
    )


if __name__ == "__main__":
    main()
