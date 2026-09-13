#!/usr/bin/env python3
"""Build UK contacts SQLite from ГИС ЖКХ providers registry XLSX.

Matches registry rows to distinct UK names from mkd.min.sqlite (or CSV).

Writes:
  data/gis-gkh/index/uk-contacts.min.sqlite
  data/gis-gkh/index/uk-contacts.min.sqlite.gz  (commit this)

Schema:
  contacts(name_key PK, name, phone, email, inn, ogrn, func)

Usage:
  # after download-gis-gkh-providers.py and build-gis-gkh-index.py
  python3 scripts/build-uk-contacts-index.py
"""

from __future__ import annotations

import gzip
import re
import shutil
import sqlite3
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data" / "gis-gkh" / "raw" / "providers-registry.xlsx"
MKD = ROOT / "data" / "gis-gkh" / "index" / "mkd.min.sqlite"
OUT_DIR = ROOT / "data" / "gis-gkh" / "index"
OUT = OUT_DIR / "uk-contacts.min.sqlite"
OUT_GZ = OUT_DIR / "uk-contacts.min.sqlite.gz"

UO_HINTS = (
    "управляющ",
    "товарищество собственников",
    "тсж",
    "жилищно-строительн",
    "жск",
    "жилищный кооператив",
    "потребительский кооператив",
)


def norm_name(value: str) -> str:
    """Stable key: lowercase, strip quotes/punct, keep legal form (ООО/ТСЖ…)."""
    text = (value or "").lower().replace("ё", "е")
    text = re.sub(r"[«»\"'`]", "", text)
    text = re.sub(r"[^a-zа-я0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def score_candidate(row: dict, gis_name: str) -> int:
    score = 0
    func = (row["func"] or "").lower()
    if any(h in func for h in UO_HINTS):
        score += 8
    if row["phone"]:
        score += 3
    if row["email"]:
        score += 3
    short_n = norm_name(row["short"] or "")
    full_n = norm_name(row["full"] or "")
    gis_n = norm_name(gis_name)
    if short_n and short_n == gis_n:
        score += 30
    if full_n and full_n == gis_n:
        score += 20
    # Prefer same legal form as in the GIS house label (ООО vs ТСЖ vs ЖСК…)
    gis_l = (gis_name or "").lower()
    cand = f"{row['short'] or ''} {row['full'] or ''}".lower()
    for form in ("ооо", "ао", "пао", "зао", "тсж", "жск", "жк", "муп", "гуп"):
        if re.search(rf"(^|[^a-zа-я0-9]){form}([^a-zа-я0-9]|$)", gis_l) and re.search(
            rf"(^|[^a-zа-я0-9]){form}([^a-zа-я0-9]|$)", cand
        ):
            score += 15
            break
    return score


def core_name(value: str) -> str:
    """Name without leading legal-form token — fallback match key."""
    text = norm_name(value)
    return re.sub(
        r"^(ооо|ао|пао|зао|тсж|жск|жк|оао|муп|гуп|нко)\s+",
        "",
        text,
    ).strip()


def load_registry() -> tuple[
    dict[str, list[dict]],
    dict[str, list[dict]],
    dict[str, list[dict]],
]:
    if not XLSX.exists():
        raise SystemExit(
            f"Missing {XLSX}; run scripts/download-gis-gkh-providers.py first"
        )
    print(f"loading {XLSX} …", flush=True)
    wb = load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    header = None
    for row in rows:
        if row and row[0] == "Полное наименование":
            header = row
            break
    if not header:
        raise SystemExit("Providers XLSX: header row not found")

    by_short: dict[str, list[dict]] = defaultdict(list)
    by_full: dict[str, list[dict]] = defaultdict(list)
    by_core: dict[str, list[dict]] = defaultdict(list)
    n = 0
    for row in rows:
        n += 1
        full = str(row[0] or "").strip()
        short = str(row[1] or "").strip()
        if short in ("-", "—", "–"):
            short = ""
        phone = str(row[8] or "").strip() or None
        email = str(row[9] or "").strip() or None
        func = str(row[10] or "").strip()
        ogrn = str(row[4] or "").strip() or None
        inn = str(row[5] or "").strip() or None
        rec = {
            "full": full,
            "short": short,
            "phone": phone,
            "email": email,
            "func": func,
            "ogrn": ogrn,
            "inn": inn,
        }
        if short:
            by_short[norm_name(short)].append(rec)
            core = core_name(short)
            if core:
                by_core[core].append(rec)
        if full:
            by_full[norm_name(full)].append(rec)
            core = core_name(full)
            if core:
                by_core[core].append(rec)
    print(f"  registry rows={n:,}", flush=True)
    return by_short, by_full, by_core


def load_gis_uk_names() -> list[str]:
    if not MKD.exists():
        # try gunzip
        gz = MKD.with_suffix(MKD.suffix + ".gz")
        if gz.exists():
            print(f"extracting {gz} …", flush=True)
            with gzip.open(gz, "rb") as src, MKD.open("wb") as dst:
                shutil.copyfileobj(src, dst)
        else:
            raise SystemExit(f"Missing {MKD}; run scripts/build-gis-gkh-index.py")
    conn = sqlite3.connect(MKD)
    names = [
        r[0]
        for r in conn.execute(
            "SELECT DISTINCT uk FROM houses WHERE uk IS NOT NULL AND uk != ''"
        )
    ]
    conn.close()
    print(f"  distinct GIS UK names={len(names):,}", flush=True)
    return names


def pick(cands: list[dict], gis_name: str) -> dict:
    return max(cands, key=lambda c: score_candidate(c, gis_name))


def main() -> None:
    by_short, by_full, by_core = load_registry()
    names = load_gis_uk_names()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()

    conn = sqlite3.connect(OUT)
    conn.execute(
        """
        CREATE TABLE contacts (
          name_key TEXT NOT NULL PRIMARY KEY,
          name TEXT,
          phone TEXT,
          email TEXT,
          inn TEXT,
          ogrn TEXT,
          func TEXT
        ) WITHOUT ROWID
        """
    )

    matched = 0
    with_phone = 0
    with_email = 0
    batch: list[tuple] = []
    for gis_name in names:
        key = norm_name(gis_name)
        if not key:
            continue
        cands = (
            by_short.get(key)
            or by_full.get(key)
            or by_core.get(core_name(gis_name))
            or []
        )
        if not cands:
            continue
        best = pick(cands, gis_name)
        display = best["short"] or best["full"] or gis_name
        batch.append(
            (
                key,
                display,
                best["phone"],
                best["email"],
                best["inn"],
                best["ogrn"],
                best["func"] or None,
            )
        )
        matched += 1
        if best["phone"]:
            with_phone += 1
        if best["email"]:
            with_email += 1
        if len(batch) >= 5_000:
            conn.executemany(
                "INSERT OR REPLACE INTO contacts VALUES (?,?,?,?,?,?,?)",
                batch,
            )
            batch.clear()

    if batch:
        conn.executemany(
            "INSERT OR REPLACE INTO contacts VALUES (?,?,?,?,?,?,?)",
            batch,
        )

    conn.commit()
    conn.execute("VACUUM")
    conn.close()

    with OUT.open("rb") as src, gzip.open(OUT_GZ, "wb", compresslevel=9) as dst:
        shutil.copyfileobj(src, dst)

    print(
        f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB) and "
        f"{OUT_GZ} ({OUT_GZ.stat().st_size / 1e6:.1f} MB) "
        f"matched={matched:,}/{len(names):,} "
        f"phone={with_phone:,} email={with_email:,}"
    )


if __name__ == "__main__":
    main()
