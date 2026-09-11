#!/usr/bin/env python3
"""Download nationwide MKD passport dump (GIS ЖКХ via tochno.st).

Source: https://tochno.st/datasets/gisgkh
License: Creative Commons BY 4.0
Fields we care about: address_id (FIAS), building/commissioning year,
internal_walls_type, management organization.

Usage:
  python3 scripts/download-gis-gkh.py
"""

from __future__ import annotations

import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "gis-gkh" / "raw"
EXTRACTED = ROOT / "data" / "gis-gkh" / "extracted"

CSV_ZIP_URL = (
    "https://storage.yandexcloud.net/tochno-st-catalog/Minstroy/"
    "data_gisgkh_157_v20251205/data_gisgkh_157_v20251205_csv.zip"
)
ZIP_NAME = "data_gisgkh_157_v20251205_csv.zip"
UA = "TokomGisGkhFetcher/1.0 (+https://tokom.ru)"


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    EXTRACTED.mkdir(parents=True, exist_ok=True)
    dest = RAW / ZIP_NAME
    if dest.exists() and dest.stat().st_size > 1_000_000:
        print(f"already have {dest} ({dest.stat().st_size / 1e6:.1f} MB)")
    else:
        print(f"downloading {CSV_ZIP_URL}")
        req = urllib.request.Request(
            CSV_ZIP_URL,
            headers={
                "User-Agent": UA,
                "Referer": "https://tochno.st/datasets/gisgkh",
            },
        )
        with urllib.request.urlopen(req, timeout=600) as resp, dest.open("wb") as out:
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        print(f"wrote {dest} ({dest.stat().st_size / 1e6:.1f} MB)")

    import zipfile

    with zipfile.ZipFile(dest) as zf:
        print("archive contents:")
        for info in zf.infolist():
            print(f"  {info.filename} ({info.file_size / 1e6:.1f} MB)")
        zf.extractall(EXTRACTED)
    print(f"extracted to {EXTRACTED}")


if __name__ == "__main__":
    main()
