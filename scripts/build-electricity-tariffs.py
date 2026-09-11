#!/usr/bin/env python3
"""Scrape residential electricity tariffs (2026) from elec.ru into a JSON index.

Source index: https://www.elec.ru/library/rd/tarify-elektroenergiya-2026/

Writes:
  data/electricity-tariffs/raw/*.html
  data/electricity-tariffs/index/regions.min.json

Each region stores periods with effective dates and rates for:
  urban / urbanElectricStove / rural
  single / dual (day,night) / triple (peak,mid,night)

When a region uses consumption ranges (1/2/3 диапазон), values are arrays
per range; UI defaults to range index 0 (1-й диапазон).
"""

from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "electricity-tariffs"
RAW_DIR = OUT_DIR / "raw"
INDEX_PATH = OUT_DIR / "index" / "regions.min.json"
BASE = "https://www.elec.ru"
INDEX_URL = f"{BASE}/library/rd/tarify-elektroenergiya-2026/"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)
SSL_CTX = ssl._create_unverified_context()


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.rows: list[list[str]] = []
        self.row: list[str] = []
        self.cell: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        if tag == "table":
            self.in_table = True
        if not self.in_table:
            return
        if tag == "tr":
            self.in_row = True
            self.row = []
        if tag in ("td", "th") and self.in_row:
            self.in_cell = True
            self.cell = []
        if tag == "br" and self.in_cell:
            self.cell.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self.in_cell:
            text = re.sub(r"\s+", " ", unescape("".join(self.cell))).strip()
            self.row.append(text)
            self.in_cell = False
        if tag == "tr" and self.in_row:
            if any(c.strip() for c in self.row):
                self.rows.append(self.row)
            self.in_row = False
        if tag == "table":
            self.in_table = False

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.cell.append(data)


def fetch(url: str, retries: int = 5) -> bytes:
    """Optional network fetch — elec.ru often serves captcha/429 to scripts."""
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9"},
            )
            with urllib.request.urlopen(req, timeout=90, context=SSL_CTX) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(2 ** attempt)
    assert last is not None
    raise last


def parse_money(raw: str) -> float | None:
    s = raw.strip().replace("\xa0", "").replace(" ", "")
    s = s.replace(",", ".")
    if not re.fullmatch(r"\d+(?:\.\d+)?", s):
        return None
    return float(s)


def parse_period_label(label: str) -> dict | None:
    m = re.search(
        r"с\s*(\d{2})\.(\d{2})\.(\d{4})\s*по\s*(\d{2})\.(\d{2})\.(\d{4})",
        label,
        flags=re.I,
    )
    if not m:
        return None
    d1 = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    d2 = date(int(m.group(6)), int(m.group(5)), int(m.group(4)))
    return {
        "from": d1.isoformat(),
        "to": d2.isoformat(),
        "label": f"с {d1.strftime('%d.%m.%Y')} по {d2.strftime('%d.%m.%Y')}",
    }


def classify_section(title: str) -> str | None:
    t = title.lower()
    if "приравнен" in t:
        return "equated"
    if "сельск" in t:
        return "rural"
    if "электроплит" in t or "электроотопит" in t:
        return "urbanElectricStove"
    if "городск" in t or "населен" in t:
        return "urban"
    return None


def is_dual_header(text: str) -> bool:
    t = text.lower()
    return "двум зонам" in t or "двум зонам суток" in t or "двухзон" in t


def is_triple_header(text: str) -> bool:
    t = text.lower()
    return "трем зонам" in t or "трём зонам" in t or "трехзон" in t or "трёхзон" in t


def is_single_header(text: str) -> bool:
    t = text.lower()
    return "одноставочн" in t and "зон" not in t


def zone_kind(text: str) -> str | None:
    t = text.lower()
    # "Дневная зона (пиковая и полупиковая)" is the dual-rate day band.
    if "дневн" in t:
        return "day"
    if "полупик" in t:
        return "mid"
    if "пиков" in t:
        return "peak"
    if "ночн" in t:
        return "night"
    return None


def chunk_values(nums: list[float], period_count: int, ranges: int) -> list[list[float]]:
    """Split flat numeric cells into [period][range]."""
    need = period_count * ranges
    if len(nums) < need:
        # Some rows omit trailing empties — pad.
        nums = nums + [None] * (need - len(nums))  # type: ignore[list-item]
    out: list[list[float]] = []
    for p in range(period_count):
        chunk = nums[p * ranges : (p + 1) * ranges]
        out.append([float(x) for x in chunk if x is not None])
    return out


def empty_group(period_count: int, ranges: int) -> dict:
    def matrix() -> list[list[float | None]]:
        return [[None] * ranges for _ in range(period_count)]

    return {
        "single": matrix(),
        "dual": {"day": matrix(), "night": matrix()},
        "triple": {"peak": matrix(), "mid": matrix(), "night": matrix()},
    }


def parse_region_html(html: str, page_slug: str, page_url: str) -> dict | None:
    parser = TableParser()
    parser.feed(html)
    rows = parser.rows
    if len(rows) < 4:
        return None

    # Period headers: usually row index 1 (two cells) or embedded in row 0.
    periods: list[dict] = []
    for cell in rows[1]:
        p = parse_period_label(cell)
        if p:
            periods.append(p)
    if not periods:
        for cell in rows[0]:
            p = parse_period_label(cell)
            if p:
                periods.append(p)
    if not periods:
        # Fallback: assume H1 / H2 2026 split used by most pages.
        periods = [
            {
                "from": "2026-01-01",
                "to": "2026-09-30",
                "label": "с 01.01.2026 по 30.09.2026",
            },
            {
                "from": "2026-10-01",
                "to": "2026-12-31",
                "label": "с 01.10.2026 по 31.12.2026",
            },
        ]

    period_count = len(periods)
    ranges = 1
    start_idx = 2
    # Range header row: "1 диапазон", "2 диапазон", ...
    if any("диапазон" in c.lower() for c in rows[2]):
        range_cells = [c for c in rows[2] if "диапазон" in c.lower()]
        ranges = max(1, len(range_cells) // period_count)
        start_idx = 3

    groups = {
        "urban": empty_group(period_count, ranges),
        "urbanElectricStove": empty_group(period_count, ranges),
        "rural": empty_group(period_count, ranges),
    }

    section: str | None = None
    mode: str | None = None  # single | dual | triple

    def put_matrix(target: list[list[float | None]], values: list[list[float]]) -> None:
        for pi, vals in enumerate(values):
            if pi >= len(target):
                break
            for ri, v in enumerate(vals):
                if ri < len(target[pi]):
                    target[pi][ri] = v

    for row in rows[start_idx:]:
        if not row:
            continue
        # Section headers like "1. Тарифы ... городских ..."
        joined = " ".join(row)
        sec = None
        if re.match(r"^\d+\.?$", row[0]) and len(row) >= 2:
            sec = classify_section(row[1])
        elif re.match(r"^\d+\.$", row[0] + ("" if len(row) < 2 else "")):
            sec = classify_section(joined)
        else:
            # Sometimes "1." and title are in one cell
            m = re.match(r"^(\d+)\.\s+(.+)$", row[0])
            if m and len(row) <= 2:
                sec = classify_section(m.group(2) if len(row) == 1 else row[0] + " " + " ".join(row[1:]))
                if not sec:
                    sec = classify_section(joined)
        if sec:
            section = sec if sec != "equated" else "urban"
            mode = None
            continue

        if section is None or section not in groups:
            # Try classifying long title rows without numbering
            maybe = classify_section(joined)
            if maybe and maybe != "equated":
                section = maybe
                mode = None
                continue
            continue

        # Mode headers 1.1 / 2.1 etc.
        head = row[1] if len(row) >= 2 and re.match(r"^\d+(\.\d+)?\.?$", row[0]) else row[0]
        if is_single_header(head) or is_single_header(joined):
            mode = "single"
            # Values may be on same row
            nums = [parse_money(c) for c in row if parse_money(c) is not None]
            nums_f = [n for n in nums if n is not None]
            if nums_f:
                put_matrix(
                    groups[section]["single"],
                    chunk_values(nums_f, period_count, ranges),
                )
            continue
        if is_dual_header(head) or is_dual_header(joined):
            mode = "dual"
            continue
        if is_triple_header(head) or is_triple_header(joined):
            mode = "triple"
            continue

        zk = zone_kind(row[0]) or (zone_kind(row[1]) if len(row) > 1 else None)
        nums = [parse_money(c) for c in row if parse_money(c) is not None]
        nums_f = [n for n in nums if n is not None]
        if not nums_f:
            continue
        matrix = chunk_values(nums_f, period_count, ranges)

        if mode == "single" and zk is None and re.search(r"одноставочн", joined, re.I):
            put_matrix(groups[section]["single"], matrix)
            continue
        if mode == "dual" and zk in ("day", "night"):
            put_matrix(groups[section]["dual"][zk], matrix)
            continue
        if mode == "triple" and zk in ("peak", "mid", "night"):
            put_matrix(groups[section]["triple"][zk], matrix)
            continue
        # Zone row without mode yet — infer from labels
        if zk == "day":
            mode = "dual"
            put_matrix(groups[section]["dual"]["day"], matrix)
        elif zk == "night" and mode == "dual":
            put_matrix(groups[section]["dual"]["night"], matrix)
        elif zk == "peak":
            mode = "triple"
            put_matrix(groups[section]["triple"]["peak"], matrix)
        elif zk == "mid":
            mode = "triple"
            put_matrix(groups[section]["triple"]["mid"], matrix)
        elif zk == "night" and mode == "triple":
            put_matrix(groups[section]["triple"]["night"], matrix)

    # Label from <title> or h1
    title_m = re.search(r"<title>([^<]+)</title>", html, flags=re.I)
    title = unescape(title_m.group(1)).strip() if title_m else page_slug
    title = re.sub(r"\s*\|.*$", "", title)
    title = re.sub(
        r"^Тарифы на электроэнергию в\s+",
        "",
        title,
        flags=re.I,
    ).strip()

    # Official act mention if present
    doc_m = re.search(
        r"((?:Приказ|Распоряжение|Постановление)[^.<]{8,220})",
        html,
        flags=re.I,
    )
    source_doc = re.sub(r"\s+", " ", unescape(doc_m.group(1))).strip() if doc_m else None

    # Alias seeds from title
    aliases = [title]
    # "Москве" → add "Москва"
    city_m = re.match(r"([^,]+?)(?:\s+и\s+|\s*$)", title)
    if city_m:
        aliases.append(city_m.group(1).strip())

    return {
        "id": page_slug,
        "label": title,
        "aliases": sorted({a for a in aliases if a}),
        "sourceUrl": page_url,
        "sourceDoc": source_doc,
        "sourceSite": "elec.ru",
        "rangeCount": ranges,
        "periods": periods,
        "groups": groups,
    }


def list_region_links(index_html: str) -> list[tuple[str, str, str]]:
    """Return [(slug, path, anchor_text), ...]."""
    out: list[tuple[str, str, str]] = []
    for m in re.finditer(
        r'href="(/library/rd/tarify-elektroenergiya-2026/([a-z0-9\-]+)\.html)"[^>]*>([^<]+)<',
        index_html,
        flags=re.I,
    ):
        path, slug, text = m.group(1), m.group(2), unescape(m.group(3)).strip()
        out.append((slug, path, text))
    # unique by slug
    seen: set[str] = set()
    uniq: list[tuple[str, str, str]] = []
    for slug, path, text in out:
        if slug in seen:
            continue
        seen.add(slug)
        uniq.append((slug, path, text))
    return uniq


def has_any_rate(region: dict) -> bool:
    for g in region["groups"].values():
        for cell in g["single"]:
            if any(v is not None for v in cell):
                return True
    return False


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)

    index_path = RAW_DIR / "_index.html"
    if index_path.exists() and index_path.stat().st_size > 10_000:
        index_html = index_path.read_text("utf-8", "replace")
        links = list_region_links(index_html)
    else:
        links = []
    if not links:
        for p in sorted(RAW_DIR.glob("*.html")):
            if p.name.startswith("_"):
                continue
            slug = p.stem
            links.append(
                (slug, f"/library/rd/tarify-elektroenergiya-2026/{slug}.html", slug)
            )
    print(f"regions listed: {len(links)}")

    regions: dict[str, dict] = {}
    failed: list[str] = []
    for i, (slug, path, text) in enumerate(links, 1):
        url = BASE + path
        dest = RAW_DIR / f"{slug}.html"
        print(f"[{i}/{len(links)}] {slug} — {text[:60]}")
        try:
            if not dest.exists() or dest.stat().st_size < 5000:
                failed.append(slug)
                print("  ! missing/small raw html")
                continue
            html = dest.read_text("utf-8", "replace")
            parsed = parse_region_html(html, slug, url)
            if not parsed or not has_any_rate(parsed):
                failed.append(slug)
                print("  ! parse failed / empty")
                continue
            aliases = set(parsed["aliases"])
            aliases.add(text)
            aliases.add(re.sub(r"^Тарифы на электроэнергию в\s+", "", text, flags=re.I))
            parsed["aliases"] = sorted(a.strip() for a in aliases if a and a.strip())
            regions[slug] = parsed
            p0 = parsed["periods"][0]["label"] if parsed["periods"] else "?"
            print(
                f"  ok periods={len(parsed['periods'])} ranges={parsed['rangeCount']} from={p0}"
            )
        except Exception as exc:  # noqa: BLE001
            failed.append(slug)
            print(f"  FAILED {exc}")

    payload = {
        "version": 1,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "sourceIndexUrl": INDEX_URL,
        "regionCount": len(regions),
        "regions": regions,
    }
    INDEX_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"wrote {INDEX_PATH} ({INDEX_PATH.stat().st_size / 1e6:.2f} MB) "
        f"regions={len(regions)}"
    )
    if failed:
        print(f"incomplete ({len(failed)}): {', '.join(failed)}", flush=True)
        if len(regions) < 70:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
