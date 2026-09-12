#!/usr/bin/env python3
"""Unzip Reform GKH raw exports into data/reform-gkh/extracted/.

Usage:
  python3 scripts/unzip-reform-gkh.py
"""

from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "reform-gkh" / "raw"
EXTRACTED = ROOT / "data" / "reform-gkh" / "extracted"


def main() -> None:
    EXTRACTED.mkdir(parents=True, exist_ok=True)
    zips = sorted(RAW.glob("*.zip"))
    if not zips:
        raise SystemExit(f"No zips in {RAW}")
    for zpath in zips:
        print(f"extract {zpath.name}")
        with zipfile.ZipFile(zpath) as zf:
            for info in zf.infolist():
                name = Path(info.filename).name
                if not name or name.startswith("."):
                    continue
                if not name.endswith(".csv"):
                    continue
                target = EXTRACTED / name
                if target.exists() and target.stat().st_size > 0:
                    continue
                with zf.open(info) as src, target.open("wb") as dst:
                    dst.write(src.read())
                print(f"  → {name} ({target.stat().st_size / 1e6:.1f} MB)")
    print("done")


if __name__ == "__main__":
    main()
