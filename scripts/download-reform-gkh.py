#!/usr/bin/env python3
"""Download Reform GKH (ФРТ) open-data dumps for Russian regions.

Source: https://аис.фрт.рф/opendata (punycode: xn--80adsazqn.xn--p1aee.xn--p1ai)

Per region:
  kr1_1 — МКД in regional overhaul program (houseguid + year)
  kr1_3 — planned/done overhaul services (electrical years)

kr1_2 (systems passport) is optional and large — skip by default.

Usage:
  python3 scripts/download-reform-gkh.py --all
  python3 scripts/download-reform-gkh.py --regions smolenskaya_oblast
  python3 scripts/download-reform-gkh.py --list-regions
  python3 scripts/download-reform-gkh.py --all --datasets kr1_1 kr1_3
"""

from __future__ import annotations

import argparse
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

BASE = "https://xn--80adsazqn.xn--p1aee.xn--p1ai"
# Browser UA — FRT rate-limits / captchas non-browser clients more aggressively.
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36"
)
SSL_CTX = ssl._create_unverified_context()

# gid → label from the territory <select> on /opendata (2026-09)
REGION_BY_GID: dict[str, str] = {
    "2208163": "Алтайский край",
    "2215422": "Амурская область",
    "2216073": "Архангельская область",
    "2220005": "Астраханская область",
    "2220463": "Белгородская область",
    "2222089": "Брянская область",
    "2224825": "Владимирская область",
    "2227349": "Волгоградская область",
    "2228920": "Вологодская область",
    "2236864": "Воронежская область",
    "2504672": "город Байконур",
    "2280999": "город Москва",
    "2276347": "город Санкт-Петербург",
    "2399515": "город Севастополь",
    "2361205": "Еврейская автономная область",
    "2333436": "Забайкальский край",
    "2243734": "Ивановская область",
    "2246043": "Иркутская область",
    "2347352": "Кабардино-Балкарская Республика",
    "2247652": "Калининградская область",
    "2258331": "Калужская область",
    "2261569": "Камчатский край",
    "2352939": "Карачаево-Черкесская Республика",
    "2261688": "Кемеровская область - Кузбасс",
    "2262823": "Кировская область",
    "2267309": "Костромская область",
    "2209858": "Краснодарский край",
    "2211647": "Красноярский край",
    "2272233": "Курганская область",
    "2273507": "Курская область",
    "2276351": "Ленинградская область",
    "2279312": "Липецкая область",
    "2280928": "Магаданская область",
    "2281126": "Московская область",
    "2287468": "Мурманская область",
    "2361342": "Ненецкий автономный округ",
    "2238753": "Нижегородская область",
    "2287629": "Новгородская область",
    "2290273": "Новосибирская область",
    "2291899": "Омская область",
    "2293481": "Оренбургская область",
    "2295251": "Орловская область",
    "2298217": "Пензенская область",
    "2299744": "Пермский край",
    "2213474": "Приморский край",
    "2303372": "Псковская область",
    "2340164": "Республика Адыгея",
    "2347543": "Республика Алтай",
    "2340399": "Республика Башкортостан",
    "2345009": "Республика Бурятия",
    "2345675": "Республика Дагестан",
    "2247643": "Республика Ингушетия",
    "2347799": "Республика Калмыкия",
    "2348078": "Республика Карелия",
    "2348894": "Республика Коми",
    "2399489": "Республика Крым",
    "2349746": "Республика Марий Эл",
    "2351376": "Республика Мордовия",
    "2360536": "Республика Саха (Якутия)",
    "2352709": "Республика Северная Осетия-Алания",
    "2353101": "Республика Татарстан",
    "2356269": "Республика Тыва",
    "2358459": "Республика Хакасия",
    "2310204": "Ростовская область",
    "2312245": "Рязанская область",
    "2270853": "Самарская область",
    "2315056": "Саратовская область",
    "2316924": "Сахалинская область",
    "2317157": "Свердловская область",
    "2319070": "Смоленская область",
    "2214158": "Ставропольский край",
    "2323682": "Тамбовская область",
    "2248754": "Тверская область",
    "2325436": "Томская область",
    "2326046": "Тульская область",
    "2329523": "Тюменская область",
    "2356486": "Удмуртская Республика",
    "2331106": "Ульяновская область",
    "2214950": "Хабаровский край",
    "2330826": "Ханты-Мансийский автономный округ - Югра",
    "2332121": "Челябинская область",
    "2358750": "Чеченская Республика",
    "2358768": "Чувашская Республика",
    "2334262": "Чукотский автономный округ",
    "2331019": "Ямало-Ненецкий автономный округ",
    "2334335": "Ярославская область",
}

# Friendly aliases for CLI
ALIASES: dict[str, str] = {
    "moscow": "2280999",
    "spb": "2276347",
    "bashkortostan": "2340399",
    "moscow_oblast": "2281126",
    "altai": "2208163",
}

# Territories that often have no regional KR dumps
SKIP_GIDS = {"2504672"}  # город Байконур

KR_DEFAULT = ("kr1_1", "kr1_3")


def slugify(label: str) -> str:
    table = str.maketrans(
        {
            "А": "a",
            "Б": "b",
            "В": "v",
            "Г": "g",
            "Д": "d",
            "Е": "e",
            "Ё": "e",
            "Ж": "zh",
            "З": "z",
            "И": "i",
            "Й": "i",
            "К": "k",
            "Л": "l",
            "М": "m",
            "Н": "n",
            "О": "o",
            "П": "p",
            "Р": "r",
            "С": "s",
            "Т": "t",
            "У": "u",
            "Ф": "f",
            "Х": "h",
            "Ц": "c",
            "Ч": "ch",
            "Ш": "sh",
            "Щ": "sch",
            "Ъ": "",
            "Ы": "y",
            "Ь": "",
            "Э": "e",
            "Ю": "yu",
            "Я": "ya",
            "а": "a",
            "б": "b",
            "в": "v",
            "г": "g",
            "д": "d",
            "е": "e",
            "ё": "e",
            "ж": "zh",
            "з": "z",
            "и": "i",
            "й": "i",
            "к": "k",
            "л": "l",
            "м": "m",
            "н": "n",
            "о": "o",
            "п": "p",
            "р": "r",
            "с": "s",
            "т": "t",
            "у": "u",
            "ф": "f",
            "х": "h",
            "ц": "c",
            "ч": "ch",
            "ш": "sh",
            "щ": "sch",
            "ъ": "",
            "ы": "y",
            "ь": "",
            "э": "e",
            "ю": "yu",
            "я": "ya",
        }
    )
    raw = label.translate(table).lower()
    raw = re.sub(r"[^a-z0-9]+", "_", raw).strip("_")
    return raw or "region"


def fetch(url: str, retries: int = 6) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
                    "Referer": f"{BASE}/opendata",
                },
            )
            with urllib.request.urlopen(req, timeout=600, context=SSL_CTX) as resp:
                data = resp.read()
            # Rate-limit / captcha pages are HTML, not zip
            if b"\xd0\xa1\xd0\xbb\xd0\xb8\xd1\x88\xd0\xba\xd0\xbe\xd0\xbc \xd0\xbc\xd0\xbd\xd0\xbe\xd0\xb3\xd0\xbe \xd0\xb7\xd0\xb0\xd0\xbf\xd1\x80\xd0\xbe\xd1\x81\xd0\xbe\xd0\xb2" in data:
                raise urllib.error.HTTPError(url, 429, "rate limited", hdrs=None, fp=None)  # type: ignore[arg-type]
            if b"captcha" in data.lower()[:4000] and not data.startswith(b"PK"):
                raise urllib.error.HTTPError(url, 429, "captcha", hdrs=None, fp=None)  # type: ignore[arg-type]
            return data
        except Exception as exc:  # noqa: BLE001
            last = exc
            code = getattr(exc, "code", None)
            wait = min(120, (3 ** attempt) + (5 if code in (403, 429, 477) else 0))
            print(f"  retry {attempt + 1}/{retries} after {wait}s: {exc}", file=sys.stderr)
            time.sleep(wait)
    assert last is not None
    raise last


def is_valid_zip(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 1000:
        return False
    try:
        with zipfile.ZipFile(path) as zf:
            return bool(zf.namelist())
    except zipfile.BadZipFile:
        return False


def existing_dataset_zip(raw_dir: Path, slug: str, dataset_id: str) -> Path | None:
    """Any valid zip for slug+dataset (export id may change over time)."""
    for path in raw_dir.glob(f"{slug}-{dataset_id}-export-*.zip"):
        if is_valid_zip(path):
            return path
    # Legacy aliases used in earlier downloads
    aliases = {
        "gorod_moskva": ["moscow"],
        "respublika_bashkortostan": ["bashkortostan"],
    }
    for alt in aliases.get(slug, []):
        for path in raw_dir.glob(f"{alt}-{dataset_id}-export-*.zip"):
            if is_valid_zip(path):
                return path
    return None


def list_region_exports(gid: str) -> list[tuple[str, str, str]]:
    """Return [(export_id, dataset_id, title), ...] for a territory gid."""
    out: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for page in (1, 2):
        html = fetch(
            f"{BASE}/opendata?gid={gid}&cids=&page={page}&pageSize=12"
        ).decode("utf-8", "replace")
        ids = re.findall(
            r"Идентификационный номер</div>\s*<div[^>]*>([^<]+)",
            html,
        )
        names = re.findall(
            r"Наименование набора</div>\s*<div[^>]*>([^<]+)",
            html,
        )
        exports = re.findall(r"/opendata/export/(\d+)", html)
        for export_id, dataset_id, title in zip(exports, ids, names):
            key = f"{export_id}:{dataset_id.strip()}"
            if key in seen:
                continue
            seen.add(key)
            out.append((export_id, dataset_id.strip(), title.strip()))
        # Stop early if page looks empty of KR sets
        if not exports:
            break
        time.sleep(0.8)
    return out


def resolve_region_keys(keys: list[str]) -> list[tuple[str, str, str]]:
    """Return [(slug, gid, label), ...]."""
    out: list[tuple[str, str, str]] = []
    for key in keys:
        gid = ALIASES.get(key)
        if gid is None and key in REGION_BY_GID:
            gid = key
        if gid is None:
            matches = [
                (slugify(label), g, label)
                for g, label in REGION_BY_GID.items()
                if slugify(label) == key or g == key
            ]
            if not matches:
                raise SystemExit(f"Unknown region key: {key}")
            out.append(matches[0])
            continue
        label = REGION_BY_GID[gid]
        out.append((slugify(label), gid, label))
    return out


def download_region(
    slug: str,
    gid: str,
    label: str,
    out_dir: Path,
    datasets: set[str],
) -> list[Path]:
    print(f"== {label} (gid={gid}, slug={slug}) ==")
    raw_dir = out_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    already = {
        ds: existing_dataset_zip(raw_dir, slug, ds)
        for ds in datasets
    }
    if all(already.values()):
        for ds, path in already.items():
            assert path is not None
            print(f"  skip complete {ds} → {path.name}")
        return list(already.values())  # type: ignore[arg-type]

    sets = list_region_exports(gid)
    wanted = {row for row in sets if row[1] in datasets}
    missing = datasets - {row[1] for row in wanted}
    if missing:
        print("Available sets:", file=sys.stderr)
        for row in sets:
            print(f"  {row[0]}\t{row[1]}\t{row[2]}", file=sys.stderr)
        raise RuntimeError(f"Missing datasets for {label}: {sorted(missing)}")

    paths: list[Path] = []
    for export_id, dataset_id, title in sorted(wanted, key=lambda r: r[1]):
        existing = existing_dataset_zip(raw_dir, slug, dataset_id)
        if existing is not None:
            print(f"  skip existing {existing.name}")
            paths.append(existing)
            continue
        dest = raw_dir / f"{slug}-{dataset_id}-export-{export_id}.zip"
        print(f"  downloading {dataset_id} → {dest.name} ({title[:50]}…)")
        data = fetch(f"{BASE}/opendata/export/{export_id}")
        if not data.startswith(b"PK"):
            raise RuntimeError(
                f"Not a zip for {dataset_id} (got {data[:80]!r})"
            )
        try:
            with zipfile.ZipFile(BytesIO(data)) as zf:
                if not zf.namelist():
                    raise RuntimeError("empty zip")
        except zipfile.BadZipFile as exc:
            raise RuntimeError(f"bad zip for {dataset_id}") from exc
        dest.write_bytes(data)
        print(f"    {dest.stat().st_size / (1024 * 1024):.1f} MB")
        paths.append(dest)
        time.sleep(1.5)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--regions",
        nargs="+",
        default=None,
        help="Region keys/gids/slugs (default with --all: every subject)",
    )
    parser.add_argument("--all", action="store_true", help="Download all subjects")
    parser.add_argument(
        "--datasets",
        nargs="+",
        default=list(KR_DEFAULT),
        choices=["kr1_1", "kr1_2", "kr1_3"],
        help="Which reports to download (default: kr1_1 kr1_3)",
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
        for gid, label in REGION_BY_GID.items():
            print(f"{slugify(label)}\t{gid}\t{label}")
        return

    if args.all:
        targets = [
            (slugify(label), gid, label)
            for gid, label in REGION_BY_GID.items()
            if gid not in SKIP_GIDS
        ]
    elif args.regions:
        targets = resolve_region_keys(args.regions)
    else:
        targets = resolve_region_keys(["moscow", "bashkortostan"])

    args.out.mkdir(parents=True, exist_ok=True)
    datasets = set(args.datasets)
    failed: list[str] = []
    for i, (slug, gid, label) in enumerate(targets):
        if gid in SKIP_GIDS:
            print(f"== skip {label} (no KR dumps) ==")
            continue
        try:
            download_region(slug, gid, label, args.out, datasets)
        except (RuntimeError, urllib.error.URLError, OSError, SystemExit) as exc:
            print(f"FAILED {label}: {exc}", file=sys.stderr)
            failed.append(label)
        # polite pacing between regions
        if i + 1 < len(targets):
            time.sleep(2.0)

    print("Done. Unzip under data/reform-gkh/extracted/ when needed.")
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
