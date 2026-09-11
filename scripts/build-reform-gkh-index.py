#!/usr/bin/env python3
"""Build a compact Reform GKH electrical/house index from extracted CSVs.

Reads data/reform-gkh/extracted/export-kr1_{1,3}-*-*.csv and writes
data/reform-gkh/index/{region}.min.json.gz for server lookup.

Each house entry:
  houseguid, address, year, floors, flats, electricalLastYear, electricalNextYear
"""

from __future__ import annotations

import csv
import gzip
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACTED = ROOT / "data" / "reform-gkh" / "extracted"
OUT_DIR = ROOT / "data" / "reform-gkh" / "index"

REGION_FILES = {
    "moscow": ("77", "Москва"),
    "bashkortostan": ("02", "Башкортостан"),
}

CURRENT_YEAR = 2026


def detect_encoding(path: Path) -> str:
    raw = path.read_bytes()
    sample = raw[:200_000]
    candidates: list[tuple[str, int]] = []
    for enc in ("utf-8-sig", "utf-8", "cp1251"):
        try:
            text = sample.decode(enc)
        except Exception:
            continue
        cyr = sum(1 for ch in text if "А" <= ch <= "я" or ch in "ёЁ")
        candidates.append((enc, cyr))
    if not candidates:
        return "utf-8-sig"
    candidates.sort(key=lambda item: item[1], reverse=True)
    return candidates[0][0]


def open_csv(path: Path):
    encoding = detect_encoding(path)
    f = path.open("r", encoding=encoding, errors="replace", newline="")
    sample = f.read(4096)
    f.seek(0)
    delim = ";" if sample.splitlines()[0].count(";") >= sample.splitlines()[0].count(",") else ","
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


def build_region(region_key: str, region_code: str, label: str) -> dict:
    kr1 = EXTRACTED / f"export-kr1_1-{region_code}-20260901.csv"
    kr3 = EXTRACTED / f"export-kr1_3-{region_code}-20260901.csv"
    if not kr1.exists() or not kr3.exists():
        raise SystemExit(f"Missing CSV for {region_key}: {kr1.name} / {kr3.name}")

    houses: dict[str, dict] = {}
    f, reader, enc1 = open_csv(kr1)
    print(f"  {kr1.name} encoding={enc1}")
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
            "g": guid,
            "a": (row.get("address") or "").strip(),
            "y": parse_year(row.get("commission_year")),
            "fl": int(floors_m.group(0)) if floors_m else None,
            "fa": int(flats_m.group(0)) if flats_m else None,
            "el": None,  # last electrical overhaul year (done)
            "en": None,  # next planned electrical overhaul year
            "mk": (row.get("mkd_code") or "").strip() or None,
        }
    f.close()

    # Map mkd_code / address → guid for kr1_3 (which has no houseguid)
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
        year = parse_year(row.get("service_date")) or parse_year(
            row.get("service_date_by_plan")
        ) or parse_year(row.get("fact_date_services_finished"))
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

    # Drop helper mk field from public payload to save space
    entries = []
    for h in houses.values():
        h.pop("mk", None)
        entries.append(h)

    print(
        f"{label}: houses={len(entries)} electrical_rows_matched={matched} "
        f"with_last={sum(1 for h in entries if h['el'])} "
        f"with_next={sum(1 for h in entries if h['en'])}"
    )
    return {
        "region": region_key,
        "label": label,
        "updated": "2026-09-01",
        "houses": entries,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key, (code, label) in REGION_FILES.items():
        payload = build_region(key, code, label)
        out = OUT_DIR / f"{key}.min.json.gz"
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        with gzip.open(out, "wb", compresslevel=9) as gz:
            gz.write(data)
        print(f"  wrote {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
