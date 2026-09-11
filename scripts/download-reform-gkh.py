#!/usr/bin/env python3
"""Download Reform GKH (ФРТ) open-data dumps for selected regions.

Source: https://аис.фрт.рф/opendata (punycode: xn--80adsazqn.xn--p1aee.xn--p1ai)

Per region the portal exposes three capital-repair reports:
  kr1_1 — МКД in regional overhaul program (house list + houseguid + year)
  kr1_2 — constructive elements / engineering systems (incl. электроснабжение)
  kr1_3 — planned/done overhaul services (incl. «ремонт … электроснабжения»)

Usage:
  python3 scripts/download-reform-gkh.py
  python3 scripts/download-reform-gkh.py --regions moscow bashkortostan
  python3 scripts/download-reform-gkh.py --list-regions
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.request
from pathlib import Path

BASE = "https://xn--80adsazqn.xn--p1aee.xn--p1ai"
UA = "TokomReformGkhFetcher/1.0 (+https://tokom.ru)"

# gid values from the territory <select> on /opendata
REGIONS: dict[str, tuple[str, str]] = {
    "moscow": ("2280999", "город Москва"),
    "bashkortostan": ("2340399", "Республика Башкортостан"),
    "altai": ("2208163", "Алтайский край"),
    "spb": ("2276347", "город Санкт-Петербург"),
    "moscow_oblast": ("2281126", "Московская область"),
}

KR_IDS = ("kr1_1", "kr1_2", "kr1_3")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": f"{BASE}/opendata"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        return resp.read()


def list_region_exports(gid: str) -> list[tuple[str, str, str]]:
    """Return [(export_id, dataset_id, title), ...] for a territory gid."""
    html = fetch(f"{BASE}/opendata?gid={gid}&page=1&pageSize=50").decode("utf-8", "replace")
    ids = re.findall(
        r"Идентификационный номер</div>\s*<div[^>]*>([^<]+)",
        html,
    )
    names = re.findall(
        r"Наименование набора</div>\s*<div[^>]*>([^<]+)",
        html,
    )
    exports = re.findall(r'/opendata/export/(\d+)', html)
    # Pair from the end: regional KR sets sit after shared reference datasets.
    out: list[tuple[str, str, str]] = []
    for export_id, dataset_id, title in zip(exports, ids, names):
        out.append((export_id, dataset_id.strip(), title.strip()))
    return out


def download_region(key: str, out_dir: Path) -> list[Path]:
    gid, label = REGIONS[key]
    print(f"== {label} (gid={gid}) ==")
    sets = list_region_exports(gid)
    wanted = {row for row in sets if row[1] in KR_IDS}
    if len(wanted) < 3:
        print("Available sets:", file=sys.stderr)
        for row in sets:
            print(f"  {row[0]}\t{row[1]}\t{row[2]}", file=sys.stderr)
        raise SystemExit(f"Expected kr1_1/2/3 for {key}, found {sorted(x[1] for x in wanted)}")

    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for export_id, dataset_id, title in sorted(wanted, key=lambda r: r[1]):
        dest = raw_dir / f"{key}-{dataset_id}-export-{export_id}.zip"
        print(f"  downloading {dataset_id} → {dest.name} ({title[:60]}…)")
        data = fetch(f"{BASE}/opendata/export/{export_id}")
        dest.write_bytes(data)
        print(f"    {dest.stat().st_size / (1024 * 1024):.1f} MB")
        paths.append(dest)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--regions",
        nargs="+",
        default=["moscow", "bashkortostan"],
        choices=sorted(REGIONS),
        help="Region keys to download (default: moscow bashkortostan)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data/reform-gkh"),
        help="Output directory",
    )
    parser.add_argument("--list-regions", action="store_true")
    args = parser.parse_args()

    if args.list_regions:
        for key, (gid, label) in REGIONS.items():
            print(f"{key}\t{gid}\t{label}")
        return

    args.out.mkdir(parents=True, exist_ok=True)
    for key in args.regions:
        download_region(key, args.out)
    print("Done. Unzip under data/reform-gkh/extracted/ when needed.")


if __name__ == "__main__":
    main()
